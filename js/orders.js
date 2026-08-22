async function loadOrders() {
    try {
        const res = await fetch("/api/orders");
        const orders = await res.json();

        const listDiv = document.getElementById("ordersList");

        if (orders.length === 0) {
            listDiv.innerHTML = `<p class="orders__empty">You haven't placed any orders yet.</p>`;
            return;
        }

        listDiv.innerHTML = "";

        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();

            listDiv.insertAdjacentHTML("beforeend", `
                <a href="/pages/orders-detail.html?id=${order.id}" class="order__card">
                    <div class="order__card--info">
                        <span class="order__card--id">Order #${order.id}</span>
                        <span class="order__card--date">${date}</span>
                    </div>
                    <span class="order__card--status status--${order.status}">${order.status}</span>
                    <span class="order__card--total">RM${order.total_amount}</span>
                </a>
            `);
        });

    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", loadOrders);