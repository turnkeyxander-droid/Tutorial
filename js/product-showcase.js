async function loadProducts() {
    const res = await fetch("/api/products");
    const products = await res.json();

    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    products.forEach(product => {
        const imageSrc = product.image_path ? product.image_path : "/images/pic1.svg";
        const cardHTML = `

            <a href="/pages/product-detail.html?id=${product.id}" class="product__card--link">
                <div class="product__card">
                    <div class="product__img--container">
                        <img src="${imageSrc}" alt="${product.name}">
                    </div>
                    <h3 class="product__name">${product.name}</h3>
                    <p class="product__category">${product.category}</p>
                    <p class="product__price">RM${product.price}</p>
                </div>
            </a>
        `;
        grid.insertAdjacentHTML("beforeend", cardHTML);
    });
}

document.addEventListener("DOMContentLoaded", loadProducts);