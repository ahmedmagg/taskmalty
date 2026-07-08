
// ==================== BACKEND CONFIGURATION ====================
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://your-render-url.onrender.com/api';

// ==================== CONTACT INFO - AHMED MAGDY ====================
const CONTACT_INFO = {
    name: 'Ahmed Magdy',
    whatsapp: '+201000414576',
    telegram: '@axvman',
    instagram: 'axvman',
    linkedin: 'https://www.linkedin.com/in/axvman',
    facebook: 'https://www.facebook.com/ahmed.magdy.813088',
    email: 'ellmdy2005@gmail.com',
    vodafoneCash: '01000414576',
    meezaCard: '5078035060801802'
};

// ==================== API HELPER ====================
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast('خطأ في الاتصال بالسيرفر', 'error');
        return { success: false, message: 'خطأ في الاتصال' };
    }
}

// ==================== UPDATED ORDER FUNCTIONS ====================
const originalNextStep = nextStep;
nextStep = async function() {
    if (currentStep === 1) {
        const service = document.getElementById('orderService').value;
        const description = document.getElementById('orderDescription').value;
        const delivery = document.getElementById('selectedDelivery').value;

        if (!service) { showToast('الرجاء اختيار الخدمة', 'error'); return; }
        if (!description) { showToast('الرجاء كتابة وصف الطلب', 'error'); return; }
        if (!delivery) { showToast('الرجاء اختيار طريقة التسليم', 'error'); return; }

        const method = document.getElementById('orderMethod').value;
        const deadline = document.getElementById('orderDeadline').value;
        const contact = document.getElementById('deliveryContact').value;
        const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;

        let serviceInfo = allServices[service];
        let basePrice = 0;
        let serviceName = '';

        if (serviceInfo) {
            serviceName = serviceInfo.name;
            const unitPrice = serviceInfo.unit ? serviceInfo.unitPrice : serviceInfo.manual;
            basePrice = serviceInfo.unit ? unitPrice * quantity : (method === 'ai' && serviceInfo.hasAI ? serviceInfo.ai : serviceInfo.manual);
            if (!serviceInfo.unit && method === 'ai' && serviceInfo.hasAI) basePrice = serviceInfo.ai;
            else if (!serviceInfo.unit) basePrice = serviceInfo.manual;
        } else {
            const pkg = dataPackages.find(p => p.key === service);
            if (pkg) { serviceName = 'باقة ' + pkg.name; basePrice = pkg.price; }
        }

        const speedMult = speedMultipliers[deadline] || 1;
        const finalPrice = Math.round(basePrice * speedMult);

        orderData = {
            service: serviceName,
            serviceKey: service,
            method: method,
            description: description,
            delivery: delivery,
            contact: contact,
            deadline: deadline,
            quantity: quantity,
            basePrice: basePrice,
            speedMult: speedMult,
            finalPrice: finalPrice
        };

        renderReview();
    }

    if (currentStep < 3) {
        currentStep++;
        updateStepUI();
    }
};

// Override processPayment to use real backend
const originalProcessPayment = processPayment;
processPayment = async function() {
    const paymentMethod = document.getElementById('selectedPayment').value;
    if (!paymentMethod) { showToast('الرجاء اختيار طريقة الدفع', 'error'); return; }

    const customerName = document.getElementById('customerName')?.value || 'غير محدد';
    const customerEmail = document.getElementById('customerEmail')?.value || '';
    const customerPhone = document.getElementById('customerPhone')?.value || '';

    const btn = document.querySelector('#orderModalFooter .btn-primary');
    btn.innerHTML = '<div class="spinner-sm"></div> جاري الإرسال...';
    btn.disabled = true;

    try {
        const response = await apiCall('/order', {
            method: 'POST',
            body: JSON.stringify({
                service: orderData.service,
                serviceKey: orderData.serviceKey,
                method: orderData.method,
                description: orderData.description,
                delivery: orderData.delivery,
                deliveryContact: orderData.contact,
                deadline: orderData.deadline,
                quantity: orderData.quantity,
                basePrice: orderData.basePrice,
                finalPrice: orderData.finalPrice,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                paymentMethod: paymentMethod
            })
        });

        if (response.success) {
            closeOrderModal();
            document.getElementById('paymentSuccessModal').classList.add('active');
            document.getElementById('successOrderId').textContent = response.orderId;
            showToast('تم إرسال الطلب بنجاح!', 'success');
        } else {
            showToast(response.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        showToast('حدث خطأ في الإرسال', 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-lock"></i> ادفع الآن';
        btn.disabled = false;
    }
};

// ==================== PAYMENT PROOF UPLOAD ====================
let paymentProofImage = null;

function handleProofUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        paymentProofImage = e.target.result;
        const preview = document.getElementById('proofPreview');
        preview.src = e.target.result;
        preview.classList.add('active');
    };
    reader.readAsDataURL(file);
}

async function submitPaymentProof() {
    const orderId = document.getElementById('proofOrderId').value;
    const notes = document.getElementById('proofNotes').value;

    if (!orderId || !paymentProofImage) {
        showToast('الرجاء إدخال رقم الطلب ورفع الإيصال', 'error');
        return;
    }

    const btn = document.getElementById('submitProofBtn');
    btn.innerHTML = '<div class="spinner-sm"></div> جاري الإرسال...';
    btn.disabled = true;

    try {
        const response = await apiCall('/payment-proof', {
            method: 'POST',
            body: JSON.stringify({
                orderId: orderId,
                proofImage: paymentProofImage,
                notes: notes
            })
        });

        if (response.success) {
            showToast('تم إرسال إثبات الدفع بنجاح!', 'success');
            closeProofModal();
        } else {
            showToast(response.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        showToast('حدث خطأ في الإرسال', 'error');
    } finally {
        btn.innerHTML = 'إرسال الإيصال';
        btn.disabled = false;
    }
}

// ==================== FALLBACK: EMAIL ORDER ====================
function sendOrderViaEmail() {
    const service = document.getElementById('orderService').value;
    const method = document.getElementById('orderMethod').value;
    const description = document.getElementById('orderDescription').value;
    const delivery = document.getElementById('selectedDelivery').value;
    const contact = document.getElementById('deliveryContact').value;
    const deadline = document.getElementById('orderDeadline').value;
    const quantity = document.getElementById('orderQuantity').value;

    const subject = `طلب جديد - ${service}`;
    const body = `
الخدمة: ${service}
طريقة التنفيذ: ${method}
الكمية: ${quantity}
مدة التسليم: ${deadline}
طريقة التواصل: ${delivery}
بيانات التواصل: ${contact}

الوصف:
${description}
    `;

    window.location.href = `mailto:ellmdy2005@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
