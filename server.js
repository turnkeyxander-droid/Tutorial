// Load environment variables from .env file
require("dotenv").config();

// Set up Express
const express = require("express");
const path = require("path");

const bcrypt = require("bcrypt");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// MySQL connection (Node.js → MySQL connection)
const mysql = require("mysql2/promise");
const pool = mysql.createPool({
    host: "localhost",
    user: "root",         
    password: "xander1234",  
    database: "signup_demo",
    waitForConnections: true,
    connectionLimit: 10
});

const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/products");
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage});

//create backend app
const app = express(); 

// Set up port
const PORT = 3000;

const session = require("express-session");

app.use(session({
    secret: "qwertyuiop",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));


//we use express.json to let express can render the JSON(data)
app.use(express.json());

// Server normal static files
app.use(express.static(__dirname));
// Serve HTML pages
app.use(express.static(path.join(__dirname, "pages")));

// Let image acccept by browser, so that the image can display
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

function requireAdmin(req, res, next) {
    if(!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }
    if(req.session.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
}

// Set up api
app.get("/api/test", (req, res) => {
    res.json({
        message: "API is working!"
    });
});

app.get("/api/stripe-key", (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Login & Signup api
app.post("/api/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Please fill in all the blank" });
        }

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ? OR username = ?",
            [email, username]
        ); //Ask mysql does a user with this email or username already exist?

        if (existing.length > 0) {
            return res.status(409).json({ message: "Username or email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "Register Successful" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please fill in all the blank" });
        }

        // 1. Look up the user by email — fetch the hashed password too
        const [users] = await pool.query(
            "SELECT id, username, password, role FROM users WHERE email = ?",
            [email]
        );

        // 2. No matching email at all
        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or pasword" });
        }

        const user = users[0]; //the found row

        // 3. Compare submitted password against the stored hash
        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches){
            return res.status(401).json({ message: "Invalid email or password"})
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        await pool.query(
            "INSERT INTO sessions (session_id, user_id) VALUES (?, ?)",
            [req.sessionID, user.id]
        );

        res.status(200).json({ message: "Login successful", username: user.username, role: user.role });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

app.get("/api/me", (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username, role: req.session.role });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post("/api/logout", async (req, res) => {

    try{
        const sessionId = req.sessionID;

        await pool.query(
            "DELETE FROM sessions WHERE session_id = ?",
            [sessionId]
        );

        req.session.destroy((err) => {

            if (err){
                console.error(err);
                return res.status(500).json({ message: "Logout failed" });
            }

            res.json({ 
                message: "Logged out" 
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error"
        });
    }
});



// Profile api
// 1. get the data from database
app.get("/api/profile", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const [users] = await pool.query(
            "SELECT username, email FROM users WHERE id = ?",
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ username: users[0].username, email: users[0].email });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 2. Save modified name and email
app.put("/api/profile", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ message: "Please fill in all the blanks" });
        }

        // chech this modified email or name is existing or not
        const [existing] = await pool.query(
            "SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?",
            [email, username, req.session.userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Username or email already taken" });
        }

        await pool.query(
            "UPDATE users SET username = ?, email = ? WHERE id = ?",
            [username, email, req.session.userId]
        );

        // name changed，inside session need upadate (If not the name still return old one)
        req.session.username = username;

        res.json({ message: "Profile updated", username });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 3. Change password
app.put("/api/profile/password", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Please fill in all the blanks" });
        }

        const [users] = await pool.query(
            "SELECT password FROM users WHERE id = ?",
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // validate"current password"correct or not
        const passwordMatches = await bcrypt.compare(currentPassword, users[0].password);

        if (!passwordMatches) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedNewPassword, req.session.userId]
        );

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});


// Product api
// 1. Catch all the product
app.get("/api/products", async (req, res) => {
    try{
        const[products] = await pool.query(
            `SELECT products.*, categories.name AS category_name 
            FROM products
            LEFT JOIN categories ON products.category_id = categories.id 
            ORDER BY products.id`
        );
        res.json(products);
    }catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 2. Catch a single product
app.get("/api/products/:id", async (req, res) => {
    try{
        const {id} = req.params;

        const [products] = await pool.query(
            `SELECT products.*, categories.name AS category_name 
            FROM products
            LEFT JOIN categories ON products.category_id = categories.id 
            WHERE products.id = ?`,
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(products[0]);
    }catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 3. Add product
app.post("/api/products", requireAdmin, upload.single("image"), async (req, res) => {
    try{
        const { name, description, productCode, categoryId, price, quantity } = req.body;
        const imagePath = req.file ? `/uploads/products/${req.file.filename}`:null;

        if (!name || !description || !productCode || !categoryId || !price || !quantity) {
            return res.status(400).json({ message: "Please fill in all the blanks"});
        }

        await pool.query(
            "INSERT INTO products (name, description, product_code, category_id, price, quantity, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, description, productCode, categoryId, price, quantity, imagePath]
        );

        res.status(201).json({ message: "Product added successfully" });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 4. update product
app.put("/api/products/:id", requireAdmin, upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, productCode, categoryId, price, quantity } = req.body;

        if (!name || !description || !productCode || !categoryId || !price || !quantity) {
            return res.status(400).json({ message: "Please fill in all the blanks" });
        }

        if (req.file) {
            const imagePath = `/uploads/products/${req.file.filename}`;

            await pool.query(
                "UPDATE products SET name = ?, description = ?, product_code = ?, category_id = ?, price = ?, quantity = ?, image_path = ? WHERE id = ?",
                [name, description, productCode, categoryId, price, quantity, imagePath, id]
            );
        } else {
            await pool.query(
                "UPDATE products SET name = ?, description = ?, product_code = ?, category_id = ?, price = ?, quantity = ? WHERE id = ?",
                [name, description, productCode, categoryId, price, quantity, id]
            );
        }

        res.json({ message: "Product updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 5. Delete product
app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query("DELETE FROM products WHERE id = ?", [id]);

        res.json({ message: "Product deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});


// Cart api
// 1. Catch current user's shopping cart
app.get("/api/cart", async (req, res) =>{
    if(!req.session.userId) {
        return res.status(401).json({ message: "Please Log in first"});
    }

    try {
        const[items] = await pool.query(
            `SELECT 
            cart_items.id, 
            cart_items.quantity, 
            products.id AS product_id,
            products.name, 
            products.price, 
            products.image_path, 
            products.quantity AS stock

            FROM cart_items 
            JOIN products ON cart_items.product_id = products.id 
            WHERE cart_items.user_id = ?`,
            [req.session.userId]
        );

        res.json(items);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 2. Add to cart
app.post("/api/cart", async (req, res) => {
    if(!req.session.userId) {
        return res.status(401).json({ message: "Please Log in first"});
    }

    try {

        const { productId, quantity } = req.body;
        // checking is this(product) already add into cart
        const [existing] = await pool.query(
            "SELECT id, quantity FROM cart_items WHERE user_id =? AND product_id = ?",
            [req.session.userId, productId]
        );

        if (existing.length > 0) {
            // If have → quantity increase，instead of add new line
            const newQuantity = existing[0].quantity + parseInt(quantity);

            await pool.query(
                "UPDATE cart_items SET quantity = ? WHERE id = ?",
                [newQuantity, existing[0].id]
            );
        } else {
            // if not yet → add new line
            await pool.query(
                "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
                [req.session.userId, productId, quantity]
            );
        }

        res.status(201).json({ message: "Added to cart" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 3. Delete cart
app.delete("/api/cart/:id", async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    } 

    try{
        const { id } = req.params;

        await pool.query("DELETE FROM cart_items WHERE id = ? AND user_id = ?", [id, req.session.userId]);

        res.json({ message: "Cart deleted successful"});

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }

    
});


// Category api
// 1. Catch all the category
app.get("/api/categories", async (req, res) => {
    try{
        const[categories] = await pool.query("SELECT * FROM categories ORDER BY id");
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 2. Add category
app.post("/api/categories", requireAdmin, async (req, res) => {
    try{
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please fill in the blank"});
        }

        const [existing] = await pool.query("SELECT id FROM categories WHERE name = ?", [name]);

        if (existing.length > 0) {
            return res.status(409).json({ message: "Category already exists" });
        }

        await pool.query("INSERT INTO categories (name) VALUES (?)", [name]);
        res.status(201).json({ message: "Category added" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 3. Update category
app.put("/api/categories/:id", requireAdmin, async (req, res) => {
    try{
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please fill in the blank"});
        }

        await pool.query("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
        res.json({ message: "Category updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

// 4. Delete category
app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    try{
        const { id } = req.params;

        await pool.query("DELETE FROM categories WHERE id = ?", [id]);
        res.json({ message: "Category deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});


// Payment api (building the payment intent)
app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const { amount } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: "myr"
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

app.post("/api/checkout", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    const connection = await pool.getConnection();

    try {
        const { address, paymentIntentId } = req.body;

        if (!address || !paymentIntentId) {
            return res.status(400).json({ message: "Missing address or payment info" });
        }

        // 1. 跟 Stripe 确认这笔付款真的成功了，不能只信任前端说"成功"
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: "Payment not completed" });
        }

        // 2. 抓出这个使用者购物车里的东西
        const [cartItems] = await connection.query(
            `SELECT cart_items.quantity, products.id AS product_id, products.name, products.price, products.quantity AS stock
             FROM cart_items
             JOIN products ON cart_items.product_id = products.id
             WHERE cart_items.user_id = ?`,
            [req.session.userId]
        );

        if (cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // 3. 开始一笔"交易"（transaction）——要嘛全部成功，要嘛全部失败
        await connection.beginTransaction();

        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 建立订单主记录
        const [orderResult] = await connection.query(
            "INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES (?, ?, ?, ?)",
            [req.session.userId, totalAmount, "paid", address]
        );

        const orderId = orderResult.insertId;

        // 逐一处理购物车里的每一项
        for (const item of cartItems) {
            // 建立订单明细（复制一份name/price快照）
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)",
                [orderId, item.product_id, item.name, item.price, item.quantity]
            );

            // 扣减库存
            await connection.query(
                "UPDATE products SET quantity = quantity - ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        // 清空这个使用者的购物车
        await connection.query("DELETE FROM cart_items WHERE user_id = ?", [req.session.userId]);

        // 4. 全部都成功了，才真正提交这笔交易
        await connection.commit();

        res.status(201).json({ message: "Order placed successfully", orderId });

    } catch (err) {
        await connection.rollback(); // 任何一步失败，全部撤销
        console.error(err);
        res.status(500).json({ message: "Checkout failed, please try again" });
    } finally {
        connection.release();
    }
});


// order api
// 1. Catch all the order
app.get("/api/orders", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    const connection = await pool.getConnection();

    try {
        const [orders] = await connection.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.session.userId]
        );

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    } finally {
        connection.release();
    }
});

// 2. catch a single order
app.get("/api/orders/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Please log in first" });
    }

    try {
        const { id } = req.params;

        // makes sure this order belongs to the current user
        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE id = ? AND user_id = ?",
            [id, req.session.userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const [items] = await pool.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [id]
        );

        res.json({ order: orders[0], items: items });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error, please try later" });
    }
});

//Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


