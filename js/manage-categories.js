const categoryOverlay = document.getElementById("categoryOverlay");
const categoryClose = document.getElementById("categoryClose");
const categoryForm = document.getElementById("categoryForm");
const categoryTableBody = document.getElementById("categoryTableBody");
const categoryModalTitle = document.getElementById("categoryModalTitle");
const categorySubmitBtn = document.getElementById("categorySubmitBtn");

let allCategories = []; // to store all categories for searching

function renderCategoryTable(categories) {
    categoryTableBody.innerHTML = "";
    categories.forEach(category => {
        const rowHTML = `
            <tr>
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td class="manage__actions">
                    <button class="action__btn action__btn--edit" data-id="${category.id}" data-name="${category.name}">Edit</button>
                    <button class="action__btn action__btn--delete" data-id="${category.id}">Delete</button>
                </td>
            </tr>
        `;
        categoryTableBody.insertAdjacentHTML("beforeend", rowHTML);
    });
}

async function loadCategoryTable() {
    try {
        const res = await fetch("/api/categories");
        const categories = await res.json();

        allCategories = categories; // save all categories for searching
        renderCategoryTable(categories); // call the rendering function

    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", loadCategoryTable);

// 新增：搜寻功能
document.getElementById("categorySearch").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    const filtered = allCategories.filter(category => {
        return (
            category.name.toLowerCase().includes(keyword) ||
            category.id.toString().includes(keyword)
        );
    });

    renderCategoryTable(filtered);
});

// open modal for adding category
document.getElementById("addCategoryBtn").addEventListener("click", () => {
    categoryForm.reset();
    document.getElementById("categoryDbId").value = "";
    categoryModalTitle.textContent = "Add Category";
    categorySubmitBtn.textContent = "Add Category";
    categoryOverlay.classList.add("active");
});

// close modal
categoryClose.addEventListener("click", () => {
    categoryOverlay.classList.remove("active");
});

categoryOverlay.addEventListener("click", (e) => {
    if (e.target === categoryOverlay) {
        categoryOverlay.classList.remove("active");
    }
});

// submit form for adding/editing category
categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dbId = document.getElementById("categoryDbId").value;
    const name = document.getElementById("categoryName").value;

    const isEditing = dbId !== "";

    const res = await fetch(isEditing ? `/api/categories/${dbId}` : "/api/categories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
        categoryOverlay.classList.remove("active");
        loadCategoryTable();
    }
});

// handle edit and delete actions
categoryTableBody.addEventListener("click", async (e) => {

    if (e.target.classList.contains("action__btn--edit")) {
        const id = e.target.dataset.id;
        const name = e.target.dataset.name;

        document.getElementById("categoryDbId").value = id;
        document.getElementById("categoryName").value = name;

        categoryModalTitle.textContent = "Edit Category";
        categorySubmitBtn.textContent = "Save Changes";
        categoryOverlay.classList.add("active");
    }

    if (e.target.classList.contains("action__btn--delete")) {
        const id = e.target.dataset.id;

        const confirmDelete = confirm("Delete this category? Products using it will show 'No category'.");
        if (!confirmDelete) return;

        const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
        const data = await res.json();

        alert(data.message);

        if (res.ok) {
            loadCategoryTable();
        }
    }
});