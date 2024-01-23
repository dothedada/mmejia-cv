(() => {
	const form = document.querySelector("form");
	const resultado = document.getElementById("resultado");
    form.addEventListener("submit", event => {
        event.preventDefault();
        event.stopPropagation();
        if (!form.checkValidity()) {
            form.querySelectorAll(":invalid")[0].focus();
        } else {
            const formData = new FormData(form);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);
            resultado.textContent = 'Enviando...';

            fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: json,
            })
                .then(async (response) => {
                    const json = await response.json();
                    if (response.status === 200) {
                        resultado.textContent = json.message;
                    } else {
                        console.log(response);
                        resultado.textContent = json.message;
                    }
                })
                .catch((error) => {
                    console.log(error);
                    resultado.textContent = 'Algo salió mal, inténtalo más tarde o contáctame directamente.';
                })
                .then(() => {
                    form.reset();
                    form.classList.remove("was-validated");
                    resultado.textContent = 'Gracias por escribirme, pronto me estaré poniendo en contacto :)';
                    setTimeout(() => resultado.classList.add("hidden"), 4000);
                });
        }
        form.classList.add("was-validated");
    },
        false
    );
})();
