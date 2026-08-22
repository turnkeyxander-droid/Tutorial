const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

// identify the order status steps for the tracker
const statusSteps = ["pending", "paid", "shipped", "completed"];

async function loadOrderDetail() {
    if (!orderId) {
        alert("No order selected");
        window.location.href = "/pages/orders.html";
        return;
    }

    try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            window.location.href = "/pages/orders.html";
            return;
        }

        const { order, items } = data;

        document.getElementById("orderTitle").textContent = `Order #${order.id}`;
        document.getElementById("orderAddress").textContent = order.shipping_address;
        document.getElementById("orderTotal").textContent = `RM${order.total_amount}`;

        // Render the order tracker based on the current status
        renderTracker(order.status);

        // Render the list of items in the order
        const itemsList = document.getElementById("orderItemsList");
        itemsList.innerHTML = "";

        items.forEach(item => {
            const subtotal = item.price * item.quantity;
            itemsList.insertAdjacentHTML("beforeend", `
                <div class="order__item--row">
                    <span>${item.product_name} x ${item.quantity}</span>
                    <span>RM${subtotal.toFixed(2)}</span>
                </div>
            `);
        });

    } catch (err) {
        console.error(err);
    }
}

function renderTracker(currentStatus) {
    const tracker = document.getElementById("orderTracker");

    // cancelled is special case, we don't show the steps, just a cancelled message
    if (currentStatus === "cancelled") {
        tracker.innerHTML = `<p class="order__cancelled">This order has been cancelled.</p>`;
        return;
    }

    const currentIndex = statusSteps.indexOf(currentStatus);

    tracker.innerHTML = "";

    statusSteps.forEach((step, index) => {
        const isCompleted = index <= currentIndex;
        const isLast = index === statusSteps.length - 1;

        tracker.insertAdjacentHTML("beforeend", `
            <div class="tracker__step ${isCompleted ? 'completed' : ''}">
                <div class="tracker__step--circle">
                    ${isCompleted ? '<i class="fa-solid fa-check"></i>' : index + 1}
                </div>
                <span class="tracker__step--label">${step}</span>
            </div>
            ${!isLast ? `<div class="tracker__line ${index < currentIndex ? 'completed' : ''}"></div>` : ''}
        `);
    });
}

document.addEventListener("DOMContentLoaded", loadOrderDetail);