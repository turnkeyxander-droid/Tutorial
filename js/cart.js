async function loadCart() {
    try {
        const res = await fetch("/api/cart");

        const items = await res.json();

        const cartItemsDiv = document.getElementById("cartItems");
        cartItemsDiv.innerHTML = "";

        if (items.length === 0) {
            cartItemsDiv.innerHTML = `<p class="cart__empty">Your cart is empty</p>`;
            document.getElementById("cartTotal").textContent = "RM0.00";
            checkoutBtn.classList.add("disabled"); // cart is empty, disable the button
            return;
        }

        checkoutBtn.classList.remove("disabled"); // cart not empty, enable the button

        let total = 0;

        items.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;

            const imageSrc = item.image_path ? item.image_path : "/images/pic1.svg";

            const itemHTML = `
                <div class="cart__item">
                    <img src="${imageSrc}" alt="${item.name}" class="cart__item--img">
                    <div class="cart__item--info">
                        <h3>${item.name}</h3>
                        <p>RM${item.price} x ${item.quantity}</p>
                    </div>
                    <p class="cart__item--subtotal">RM${subtotal.toFixed(2)}</p>
                    <button class="cart__item--remove" data-id="${item.id}">Remove</button>
                </div>
            `;
            cartItemsDiv.insertAdjacentHTML("beforeend", itemHTML);
        });

        document.getElementById("cartTotal").textContent = `RM${total.toFixed(2)}`;

    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", loadCart);

document.getElementById("cartItems").addEventListener("click", async (e) => {
    if (e.target.classList.contains("cart__item--remove")) {
        const id = e.target.dataset.id;

        const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
        const data = await res.json();

        if (res.ok) {
            loadCart(); 
        } else {
            alert(data.message);
        }
    }
});

