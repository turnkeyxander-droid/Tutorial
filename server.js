// Set up Express
const express = require("express");
const path = require("path");

const bcrypt = require("bcrypt");

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
        const[products] = await pool.query("SELECT * FROM products ORDER BY id");
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

        const [products] = await pool.query("SELECT * FROM products WHERE id = ?", [id])
        
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
        const { name, description, productCode, category, price, quantity } = req.body;
        const imagePath = req.file ? `/uploads/products/${req.file.filename}`:null;

        if (!name || !description || !productCode || !category || !price || !quantity) {
            return res.status(400).json({ message: "Please fill in all the blanks"});
        }

        await pool.query(
            "INSERT INTO products (name, description, product_code, category, price, quantity, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, description, productCode, category, price, quantity, imagePath]
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
        const { name, description, productCode, category, price, quantity } = req.body;

        if (!name || !description || !productCode || !category || !price || !quantity) {
            return res.status(400).json({ message: "Please fill in all the blanks" });
        }

        if (req.file) {
            const imagePath = `/uploads/products/${req.file.filename}`;

            await pool.query(
                "UPDATE products SET name = ?, description = ?, product_code = ?, category = ?, price = ?, quantity = ?, image_path = ? WHERE id = ?",
                [name, description, productCode, category, price, quantity, imagePath, id]
            );
        } else {
            await pool.query(
                "UPDATE products SET name = ?, description = ?, product_code = ?, category = ?, price = ?, quantity = ? WHERE id = ?",
                [name, description, productCode, category, price, quantity, id]
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


//Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

