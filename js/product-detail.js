const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let currentQuantity = 1;
let maxStock = 1;

const quantityInput = document.getElementById("quantityInput");
const qtyMinus = document.getElementById("qtyMinus");
const qtyPlus = document.getElementById("qtyPlus");

function updateQuantityUI() {
    quantityInput.value = currentQuantity;
    qtyMinus.disabled = currentQuantity <= 1;
    qtyPlus.disabled = currentQuantity >= maxStock;
}

qtyMinus.addEventListener("click", () => {
    if (currentQuantity > 1) {
        currentQuantity--;
        updateQuantityUI();
    }
});

qtyPlus.addEventListener("click", () => {
    if (currentQuantity < maxStock) {
        currentQuantity++;
        updateQuantityUI();
    }
});

quantityInput.addEventListener("input", () => {
    let typedValue = parseInt(quantityInput.value);

    if(isNaN(typedValue)) {
        typedValue = 1;
    }

    if (typedValue > maxStock) {
        typedValue = maxStock;
    } else if (typedValue < 1) {
        typedValue = 1;
    }

    currentQuantity = typedValue;
    updateQuantityUI();
});

async function loadProductDetail() {
    if (!productId) {
        alert("No product selected");
        window.location.href = "/pages/product.html";
        return;
    }

    try {
        const res = await fetch(`/api/products/${productId}`);
        const product = await res.json();

        if (!res.ok) {
            alert(product.message);
            window.location.href = "/pages/product.html";
            return;
        }

        document.getElementById("detailName").textContent = product.name;
        document.getElementById("detailDescription").textContent = product.description;
        document.getElementById("detailCategory").textContent = product.category;
        document.getElementById("detailPrice").textContent = `RM${product.price}`;
        document.getElementById("stockNote").textContent = `${product.quantity} in stock`;
        document.getElementById("detailImg").src = product.image_path ? product.image_path : "/images/pic1.svg";

        maxStock = product.quantity;
        currentQuantity = 1;
        updateQuantityUI();

    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", loadProductDetail);

document.getElementById("addToCartBtn").addEventListener("click", async () => {
    try {
        const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: productId,
                quantity: currentQuantity
            })
        });

        const data = await res.json();
        alert(data.message);

    } catch (err) {
        console.error(err);
        alert("Something went wrong, please try again");
    }
});