/* ============================================================
   LÓGICA DE PROCESAMIENTO DEL FORMULARIO DE PEDIDO
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('purchaseForm');
    const confirmation = document.getElementById('confirmation');
    const tieneFormulaRadios = document.getElementsByName('tieneFormula');
    const prescriptionBlock = document.getElementById('prescriptionBlock');
    const formulaFile = document.getElementById('formulaFile');
    const formulaFileName = document.getElementById('formulaFileName');

    // Manejar la visibilidad del bloque de fórmula óptica
    tieneFormulaRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'no') {
                prescriptionBlock.style.display = 'none';
            } else {
                prescriptionBlock.style.display = 'block';
            }
        });
    });

    // Mostrar el nombre del archivo seleccionado
    formulaFile.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            formulaFileName.textContent = this.files[0].name;
        } else {
            formulaFileName.textContent = 'Ningún archivo seleccionado';
        }
    });

    // Procesar el envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validar formulario
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Generar número de pedido aleatorio
        const orderId = 'PED-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Obtener datos del formulario
        const formData = new FormData(form);
        const nombre = formData.get('nombre');

        // Mostrar confirmación
        document.getElementById('confirmName').textContent = nombre;
        document.getElementById('confirmModel').textContent = 'Isabella Caztle';
        document.getElementById('confirmOrderId').textContent = orderId;

        // Ocultar formulario y mostrar confirmación
        form.style.display = 'none';
        confirmation.hidden = false;

        // Aquí se enviarían los datos a un servidor en una implementación real
        console.log('Pedido enviado:', {
            orderId: orderId,
            nombre: nombre,
            datos: Object.fromEntries(formData)
        });
    });
});