let stripe;
let elements;
let cartTotal = 0;
let cartItems = [];

// ========== 第一步：载入购物车资料，显示汇总 ==========
async function loadCheckoutSummary() {
    const res = await fetch("/api/cart");
    cartItems = await res.json();

    if (cartItems.length === 0) {
        alert("Your cart is empty");
        window.location.href = "/pages/product.html";
        return;
    }

    const itemsDiv = document.getElementById("checkoutItems");
    itemsDiv.innerHTML = "";
    cartTotal = 0;

    cartItems.forEach(item => {
        const subtotal = item.price * item.quantity;
        cartTotal += subtotal;

        itemsDiv.insertAdjacentHTML("beforeend", `
            <div class="checkout__item">
                <span>${item.name} x ${item.quantity}</span>
                <span>RM${subtotal.toFixed(2)}</span>
            </div>
        `);
    });

    document.getElementById("checkoutTotal").textContent = `RM${cartTotal.toFixed(2)}`;
}

// ========== 第二步：初始化 Stripe ==========
async function initStripe() {
    // 先问后端要公开金钥
    const keyRes = await fetch("/api/stripe-key");
    const keyData = await keyRes.json();

    stripe = Stripe(keyData.publishableKey);

    // 再问后端要 client_secret（依据购物车总金额）
    const intentRes = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cartTotal })
    });
    const intentData = await intentRes.json();

    // 用 client_secret 建立付款表单，塞进 #payment-element
    elements = stripe.elements({ clientSecret: intentData.clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
}

// ========== 第三步：使用者按下 Pay Now ==========
document.getElementById("payButton").addEventListener("click", async (e) => {
    e.preventDefault();

    const address = document.getElementById("shippingAddress").value;
    const messageEl = document.getElementById("checkoutMessage");

    if (!address) {
        messageEl.textContent = "Please enter your shipping address";
        return;
    }

    const payButton = document.getElementById("payButton");
    payButton.disabled = true;
    payButton.textContent = "Processing...";

    // 请 Stripe 处理付款（信用卡资讯从头到尾不经过我们的服务器）
    const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required" // 不跳转页面，付款结果直接回传给我们处理
    });

    if (error) {
        messageEl.textContent = error.message;
        payButton.disabled = false;
        payButton.textContent = "Pay Now";
        return;
    }

    // 付款成功 → 通知我们自己的后端，建立订单
    const orderRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            address: address,
            paymentIntentId: paymentIntent.id
        })
    });

    const orderData = await orderRes.json();

    if (orderRes.ok) {
        alert("Order placed successfully!");
        window.location.href = "/pages/product.html";
    } else {
        messageEl.textContent = orderData.message;
        payButton.disabled = false;
        payButton.textContent = "Pay Now";
    }
});

// 启动流程：先算好购物车总额，再初始化Stripe（Stripe要知道金额才能建付款意图）
(async function start() {
    await loadCheckoutSummary();
    await initStripe();
})();