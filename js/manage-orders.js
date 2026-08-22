const orderTableBody = document.getElementById("orderTableBody");
let allOrders = [];

async function loadOrders() {
    try {
        const res = await fetch("/api/admin/orders");
        const orders = await res.json();

        allOrders = orders;
        renderOrderTable(orders);

    } catch (err) {
        console.error(err);
    }
}

function renderOrderTable(orders) {
    orderTableBody.innerHTML = "";

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();

        const rowHTML = `
            <tr>
                <td>#${order.id}</td>
                <td title="${order.username}">${order.username}</td>
                <td title="${order.email}">${order.email}</td>
                <td>RM${order.total_amount}</td>
                <td>${date}</td>
                <td>
                    <select class="status__select" data-id="${order.id}">
                        <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
                        <option value="paid" ${order.status === "paid" ? "selected" : ""}>Paid</option>
                        <option value="shipped" ${order.status === "shipped" ? "selected" : ""}>Shipped</option>
                        <option value="completed" ${order.status === "completed" ? "selected" : ""}>Completed</option>
                        <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>
                </td>
                <td class="manage__actions">
                    <button class="action__btn action__btn--edit view-btn" data-id="${order.id}">View</button>
                </td>
            </tr>
        `;
        orderTableBody.insertAdjacentHTML("beforeend", rowHTML);
    });
}

document.addEventListener("DOMContentLoaded", loadOrders);

// search functionality
document.getElementById("orderSearch").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    const filtered = allOrders.filter(order => {
        return (
            order.id.toString().includes(keyword) ||
            order.username.toLowerCase().includes(keyword) ||
            order.email.toLowerCase().includes(keyword)
        );
    });

    renderOrderTable(filtered);
});

// status dropdown change + View button (event delegation)
orderTableBody.addEventListener("change", async (e) => {
    if (e.target.classList.contains("status__select")) {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;

        const res = await fetch(`/api/admin/orders/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json();
        alert(data.message);
    }
});

orderTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("view-btn")) {
        const id = e.target.dataset.id;
        window.location.href = `/pages/order-detail.html?id=${id}`;
    }
});