const productOverlay = document.getElementById("productOverlay");
const productClose = document.getElementById("productClose");
const productForm = document.getElementById("productForm");
const productModalTitle = document.getElementById("productModalTitle");
const productSubmitBtn = document.getElementById("productSubmitBtn");
const productTableBody = document.getElementById("productTableBody");

// Load and display the table
async function loadProductTable() {
    try {
        const res = await fetch("/api/products");
        const products = await res.json();

        productTableBody.innerHTML = "";

        products.forEach(product => {
            const rowHTML = `
                <tr>
                    <td>${product.id}</td>
                    <td>
                        <img src="${product.image_path || '/images/pic1.svg'}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">
                    </td>
                    <td>${product.name}</td>
                    <td>${product.description}</td>
                    <td>${product.product_code}</td>
                    <td>${product.category}</td>
                    <td>RM${product.price}</td>
                    <td>${product.quantity}</td>
                    <td class="manage__actions">
                        <button class="action__btn action__btn--edit" data-id="${product.id}">Edit</button>
                        <button class="action__btn action__btn--delete" data-id="${product.id}">Delete</button>
                    </td>
                </tr>
            `;
            productTableBody.insertAdjacentHTML("beforeend", rowHTML);
        });

    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", loadProductTable);

//open Add modal
document.getElementById("addProductBtn").addEventListener("click", () => {
    productForm.reset();
    document.getElementById("productDbId").value = "";

    // preview = none
    document.getElementById("imagePreview").style.display = "none"

    productModalTitle.textContent = "Add Product";
    productSubmitBtn.textContent = "Add Product";
    productOverlay.classList.add("active");
});

// close modal
productClose.addEventListener("click", () => {
    productOverlay.classList.remove("active");
});

productOverlay.addEventListener("click", (e) => {
    if (e.target === productOverlay) {
        productOverlay.classList.remove("active");
    }
});

// submit list（Add or Edit）
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dbId = document.getElementById("productDbId").value;

    const formData = new FormData();
    formData.append("name", document.getElementById("productName").value);
    formData.append("description", document.getElementById("detailDescription").value);
    formData.append("productCode", document.getElementById("productCode").value);
    formData.append("category", document.getElementById("productCategory").value);
    formData.append("price", document.getElementById("productPrice").value);
    formData.append("quantity", document.getElementById("productQuantity").value);

    const imageFile = document.getElementById("productImage").files[0];
    if (imageFile) {
        formData.append("image", imageFile);
    }

    const isEditing = dbId !== "";

    const res = await fetch(isEditing ? `/api/products/${dbId}` : "/api/products", {
        method: isEditing ? "PUT" : "POST",
        body: formData
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        productOverlay.classList.remove("active");
        loadProductTable();
    }
});

//  Edit / Delete btn (Event Delegation)
productTableBody.addEventListener("click", async (e) => {

    // click edit btn
    if (e.target.classList.contains("action__btn--edit")) {
        const id = e.target.dataset.id;

        const res = await fetch(`/api/products/${id}`);
        const product = await res.json();

        if (res.ok) {
            document.getElementById("productDbId").value = product.id;
            document.getElementById("productName").value = product.name;
            document.getElementById("detailDescription").value = product.description;
            document.getElementById("productCode").value = product.product_code;
            document.getElementById("productCategory").value = product.category;
            document.getElementById("productPrice").value = product.price;
            document.getElementById("productQuantity").value = product.quantity;

            document.getElementById("productImage").value = "";
            const preview = document.getElementById("imagePreview");
            if (product.image_path){
                preview.src = product.image_path;
                preview.style.display = "block";
            } else {
                preview.style.display = "none";
            }

            productModalTitle.textContent = "Edit Product";
            productSubmitBtn.textContent = "Save Changes";
            productOverlay.classList.add("active");
        }
    }

    // click delete btn
    if (e.target.classList.contains("action__btn--delete")) {
        const id = e.target.dataset.id;

        const confirmDelete = confirm("Are you sure you want to delete this product?");
        if (!confirmDelete) return;

        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        const data = await res.json();

        alert(data.message);

        if (res.ok) {
            loadProductTable();
        }
    }


    // Exist checking
    const productImageInput = document.getElementById("productImage");

    if (productImageInput) {
        productImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            const preview = document.getElementById("imagePreview");

            if (file) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = "block";
            }
        });
    }
});