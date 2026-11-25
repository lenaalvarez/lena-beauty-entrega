// LENA BEAUTY - Proyecto final Front-End
// Catálogo original + Fetch API + manipulación del DOM + carrito + localStorage.
const API_URL = "https://dummyjson.com/products/category/beauty?limit=3";
// Clave nueva para iniciar esta versión con el carrito vacío.
 // Desde ahora, los productos que la persona agregue sí se conservarán al recargar la página.
const STORAGE_KEY = "lenaBeautyCart_v3";
// Esta versión comienza con el carrito vacío y deja de reutilizar pruebas anteriores.
try {
    localStorage.removeItem("lenaBeautyCart");
    localStorage.removeItem("lenaBeautyCart_v2");
} catch (error) {
    console.warn("No se pudieron limpiar claves anteriores del carrito.", error);
}
// Conversión de referencia para mostrar en ARS los precios de la API (dólar MEP venta, 25/11/2026).
// Es un valor demostrativo: no representa una cotización automática ni un precio comercial real.
const USD_TO_ARS = 1695.10;
const productsGrid = document.querySelector("#products-grid");
const apiProductsGrid = document.querySelector("#api-products-grid");
const apiStatus = document.querySelector("#api-status");
const cartCount = document.querySelector("#cart-count");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartContent = document.querySelector("#cart-content");
const cartTotal = document.querySelector("#cart-total");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutMessage = document.querySelector("#checkout-message");
const contactForm = document.querySelector("#contact-form");

// Se conservan los 18 productos originales definidos en el HTML.
const products = [...productsGrid.querySelectorAll(".producto")].map((card) => {
    const image = card.querySelector("img");
    const priceText = card.querySelector(".precio")?.textContent.trim() || "0";
    return {
        id: Number(card.dataset.productId),
        title: card.querySelector("h3")?.textContent.trim() || "Producto",
        price: Number(priceText.replace(/[^0-9,]/g, "").replace(/\./g, "").replace(",", ".")),
        thumbnail: image?.getAttribute("src") || "",
        imageAlt: image?.alt || ""
    };
});
let cart = loadCart();

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(saved)) return [];
        // Descarta datos incompletos o antiguos para evitar cantidades y totales inválidos.
        return saved.filter((item) =>
            item && (typeof item.id === "number" || typeof item.id === "string") &&
            typeof item.title === "string" && Number.isFinite(Number(item.price)) &&
            Number(item.price) >= 0 && Number.isInteger(Number(item.quantity)) &&
            Number(item.quantity) > 0 && [undefined, "ARS", "USD"].includes(item.currency)
        ).map((item) => ({
            ...item,
            price: Number(item.price),
            quantity: Number(item.quantity),
            currency: item.currency || "ARS"
        }));
    } catch (error) {
        console.error("No se pudo recuperar el carrito:", error);
        return [];
    }
}
function saveCart() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.error("No se pudo guardar el carrito:", error);
        checkoutMessage.textContent = "No se pudo guardar el carrito en este navegador.";
    }
}
function formatPrice(value) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

const apiCatalog = [];

// Traducciones al español para los productos de muestra de DummyJSON.
function translateApiProduct(product) {
    const sourceTitle = String(product.title || "").toLowerCase();
    const sourceDescription = String(product.description || "").toLowerCase();

    const translations = [
        { match: /mascara|lash princess/, title: "Máscara de pestañas", description: "Realzá tu mirada con una máscara de pestañas de acabado definido. Ideal para sumar intensidad a tu maquillaje diario." },
        { match: /eyeshadow|palette/, title: "Paleta de sombras", description: "Una selección de tonos para crear looks naturales o más intensos. Aplicá y difuminá los colores según el estilo que quieras lograr." },
        { match: /powder|canister/, title: "Polvo compacto", description: "Polvo de acabado suave para ayudar a matificar la piel y completar tu maquillaje." },
        { match: /lipstick|lip stick/, title: "Labial", description: "Color para tus labios y un toque final para tu maquillaje. Elegí cómo combinarlo con tu look." },
        { match: /nail polish|nail/, title: "Esmalte de uñas", description: "Un toque de color para tus uñas. Aplicá una o dos capas según la intensidad que prefieras." },
        { match: /foundation|concealer/, title: "Maquillaje para el rostro", description: "Producto de maquillaje pensado para unificar visualmente el tono y completar tu rutina de belleza." },
        { match: /perfume|fragrance|cologne/, title: "Fragancia", description: "Una fragancia para acompañar tu estilo y sumar un detalle especial a tu rutina." },
        { match: /skin|cream|moistur|serum|lotion/, title: "Cuidado para la piel", description: "Una opción para complementar tu rutina de cuidado personal. Incorporala de acuerdo con las necesidades de tu piel." }
    ];
    const found = translations.find((item) => item.match.test(sourceTitle) || item.match.test(sourceDescription));
    if (found) return { title: found.title, description: found.description };
    return {
        title: "Producto de belleza recomendado",
        description: "Una opción de muestra obtenida desde nuestro catálogo de demostración para descubrir nuevos productos de belleza."
    };
}

// Fetch API: solicita datos REST y crea tarjetas con imagen, título y precio.
// Se muestran dentro de la sección Productos existente, sin reemplazar los 18 productos propios.
async function fetchApiProducts() {
    if (!apiProductsGrid || !apiStatus) return;
    apiStatus.textContent = "Preparando recomendaciones...";
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        const data = await response.json();
        const fetchedProducts = Array.isArray(data.products) ? data.products : [];
        if (!fetchedProducts.length) throw new Error("La API no devolvió productos.");
        apiProductsGrid.replaceChildren();
        fetchedProducts.forEach((product) => {
            const translated = translateApiProduct(product);
            const card = document.createElement("article");
            card.className = "producto api-producto";
            const image = document.createElement("img");
            const recommendationImages = {
                "Máscara de pestañas": "./img/recommendation-mascara.jpg",
                "Paleta de sombras": "./img/recommendation-paleta.jpg",
                "Polvo compacto": "./img/recommendation-polvo.jpg"
            };
            image.src = recommendationImages[translated.title] || product.thumbnail || product.images?.[0] || "";
            image.alt = `Imagen de ${translated.title}`;
            image.loading = "lazy";
            image.tabIndex = 0;
            image.setAttribute("role", "button");
            image.setAttribute("aria-label", `Ampliar imagen de ${product.title}`);
            image.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openLightbox(image);
                }
            });
            image.onerror = () => {
                image.onerror = null;
                image.src = "./img/skincare.jpg";
            };
            const info = document.createElement("div");
            info.className = "producto-info";
            const title = document.createElement("h3");
            title.textContent = translated.title;
            const description = document.createElement("p");
            description.textContent = translated.description;
            const price = document.createElement("span");
            price.className = "precio";
            const priceInARS = Math.round(Number(product.price) * USD_TO_ARS);
            price.textContent = formatPrice(priceInARS);
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "btn-producto";
            addButton.textContent = "Agregar al carrito";
            addButton.dataset.addApiToCart = String(product.id);
            info.append(title, description, price, addButton);
            card.append(image, info);
            apiProductsGrid.append(card);
            apiCatalog.push({ id: `api-${product.id}`, title: translated.title, price: priceInARS, currency: "ARS", quantity: 0, thumbnail: image.src, imageAlt: image.alt });
        });
        apiStatus.textContent = "Nuevas opciones para descubrir.";
    } catch (error) {
        console.error("Error al consultar la API REST:", error);
        apiStatus.textContent = "No se pudieron cargar los productos de muestra. El catálogo original sigue disponible.";
    }
}

function clearCheckoutMessage() {
    checkoutMessage.textContent = "";
}

function addToCart(id) {
    const product = [...products, ...apiCatalog].find((item) => item.id === id);
    if (!product) return;
    clearCheckoutMessage();
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart();
    renderCart();
}

productsGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-to-cart]");
    if (button) addToCart(Number(button.dataset.addToCart));
});
apiProductsGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-api-to-cart]");
    if (!button) return;
    const product = apiCatalog.find((item) => item.id === `api-${button.dataset.addApiToCart}`);
    if (product) addToCart(product.id);
});
function changeQuantity(id, value) {
    clearCheckoutMessage();
    const quantity = Number.parseInt(value, 10);
    if (!Number.isInteger(quantity) || quantity < 1) { removeFromCart(id); return; }
    const item = cart.find((product) => product.id === id);
    if (item) item.quantity = quantity;
    saveCart(); renderCart();
}
function removeFromCart(id) {
    clearCheckoutMessage();
    cart = cart.filter((item) => item.id !== id);
    saveCart();
    renderCart();
}
function renderCart() {
    cartItems.replaceChildren();
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartEmpty.hidden = cart.length !== 0;
    cartContent.hidden = cart.length === 0;
    const totals = cart.reduce((groups, item) => {
        const currency = item.currency || "ARS";
        groups[currency] = (groups[currency] || 0) + item.price * item.quantity;
        return groups;
    }, {});
    cartTotal.textContent = Object.entries(totals).map(([currency, total]) => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(total)).join(" + ");
    cart.forEach((item) => {
        const row = document.createElement("tr");
        const name = document.createElement("th"); name.scope = "row"; name.textContent = item.title;
        const price = document.createElement("td"); price.textContent = new Intl.NumberFormat("es-AR", { style: "currency", currency: item.currency || "ARS", maximumFractionDigits: 0 }).format(item.price);
        const quantityCell = document.createElement("td");
        const input = document.createElement("input"); input.type = "number"; input.min = "1"; input.step = "1"; input.value = item.quantity;
        input.className = "cart-quantity"; input.setAttribute("aria-label", `Cantidad de ${item.title}`);
        input.addEventListener("change", (event) => changeQuantity(item.id, event.target.value));
        quantityCell.append(input);
        const subtotal = document.createElement("td"); subtotal.textContent = new Intl.NumberFormat("es-AR", { style: "currency", currency: item.currency || "ARS", maximumFractionDigits: 0 }).format(item.price * item.quantity);
        const actions = document.createElement("td");
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn-remove"; remove.textContent = "Eliminar";
        remove.setAttribute("aria-label", `Eliminar ${item.title} del carrito`);
        remove.addEventListener("click", () => removeFromCart(item.id)); actions.append(remove);
        row.append(name, price, quantityCell, subtotal, actions); cartItems.append(row);
    });
}
checkoutButton.addEventListener("click", () => {
    if (!cart.length) return;
    if (!window.confirm("Esta es una compra de demostración, no se realizará ningún cobro. ¿Confirmás?")) return;
    cart = []; saveCart(); renderCart(); checkoutMessage.textContent = "¡Compra de demostración realizada! El carrito quedó vacío.";
});
contactForm.addEventListener("submit", (event) => {
    const name = contactForm.elements.nombre.value.trim();
    const email = contactForm.elements.email.value.trim();
    const message = contactForm.elements.mensaje.value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !validEmail || !message) {
        event.preventDefault(); window.alert("Comprobá que nombre, correo válido y mensaje estén completos.");
    }
});
renderCart();
fetchApiProducts();

// Visor ampliado: funciona con clic, teclado y controles anterior/siguiente.
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
let galleryImages = [];
let activeImageIndex = 0;
let lastFocusedElement = null;
let lightboxZoom = 1;
let panX = 0;
let panY = 0;
let isDraggingImage = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

function updateLightboxZoom() {
    lightboxImage.style.setProperty("transform", `translate3d(${panX}px, ${panY}px, 0) scale(${lightboxZoom})`, "important");
    lightboxImage.style.setProperty("transform-origin", "center center", "important");
    lightboxImage.style.setProperty("cursor", lightboxZoom > 1 ? (isDraggingImage ? "grabbing" : "grab") : "zoom-in");
}
function resetLightboxZoom() {
    lightboxZoom = 1;
    panX = 0;
    panY = 0;
    updateLightboxZoom();
}
function changeLightboxZoom(amount) {
    lightboxZoom = Math.min(4, Math.max(1, lightboxZoom + amount));
    if (lightboxZoom === 1) { panX = 0; panY = 0; }
    updateLightboxZoom();
}

function showLightboxImage(index) {
    if (!galleryImages.length) return;
    activeImageIndex = (index + galleryImages.length) % galleryImages.length;
    const selected = galleryImages[activeImageIndex];
    resetLightboxZoom();
    lightboxImage.src = selected.src;
    lightboxImage.alt = selected.alt;
    lightboxCaption.textContent = selected.alt;
}
function openLightbox(image) {
    galleryImages = [...document.querySelectorAll(".producto img")].filter((item) => item.offsetParent !== null);
    activeImageIndex = Math.max(0, galleryImages.indexOf(image));
    lastFocusedElement = document.activeElement;
    resetLightboxZoom();
    showLightboxImage(activeImageIndex);
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
}
function closeLightbox() {
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    if (lastFocusedElement) lastFocusedElement.focus();
}
document.addEventListener("click", (event) => {
    const image = event.target.closest(".producto img");
    if (image && !lightbox.contains(image)) openLightbox(image);
});
document.querySelectorAll(".producto img").forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Ampliar imagen: ${image.alt}`);
    image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(image);
        }
    });
});
lightboxClose.addEventListener("click", closeLightbox);
document.querySelector(".lightbox-prev").addEventListener("click", () => showLightboxImage(activeImageIndex - 1));
document.querySelector(".lightbox-next").addEventListener("click", () => showLightboxImage(activeImageIndex + 1));
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showLightboxImage(activeImageIndex - 1);
    if (event.key === "ArrowRight") showLightboxImage(activeImageIndex + 1);
});


// Controles del zoom: se registran una sola vez, fuera de addToCart().
document.querySelector(".lightbox-zoom-in").addEventListener("click", () => changeLightboxZoom(0.5));
document.querySelector(".lightbox-zoom-out").addEventListener("click", () => changeLightboxZoom(-0.5));
document.querySelector(".lightbox-zoom-reset").addEventListener("click", resetLightboxZoom);

let suppressImageClick = false;
lightboxImage.addEventListener("click", () => {
    if (suppressImageClick) { suppressImageClick = false; return; }
    if (lightboxZoom === 1) changeLightboxZoom(1.5);
    else resetLightboxZoom();
});
lightboxImage.addEventListener("wheel", (event) => {
    event.preventDefault();
    changeLightboxZoom(event.deltaY < 0 ? 0.25 : -0.25);
}, { passive: false });
lightboxImage.addEventListener("pointerdown", (event) => {
    if (lightboxZoom <= 1) return;
    isDraggingImage = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    lightboxImage.setPointerCapture(event.pointerId);
    updateLightboxZoom();
});
lightboxImage.addEventListener("pointermove", (event) => {
    if (!isDraggingImage) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) suppressImageClick = true;
    panX = dragOriginX + dx;
    panY = dragOriginY + dy;
    updateLightboxZoom();
});
function stopImageDrag() {
    isDraggingImage = false;
    updateLightboxZoom();
}
lightboxImage.addEventListener("pointerup", stopImageDrag);
lightboxImage.addEventListener("pointercancel", stopImageDrag);

// El zoom de las tarjetas sigue la posición del puntero.
document.addEventListener("pointermove", (event) => {
    const image = event.target.closest?.(".productos .producto img");
    if (!image) return;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    image.style.setProperty("--zoom-x", `${x}%`);
    image.style.setProperty("--zoom-y", `${y}%`);
});
