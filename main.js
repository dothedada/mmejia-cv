(() => {
	const forms = document.querySelectorAll(".needs-validation");
	const result = document.getElementById("result");
    for(const form of forms) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            event.stopPropagation();
            if (!form.checkValidity()) {
                form.querySelectorAll(":invalid")[0].focus();
            } else {
                const formData = new FormData(form);
                const object = Object.fromEntries(formData);
                const json = JSON.stringify(object);
                result.textContent = 'Enviando...';

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
                            result.textContent = json.message;
                        } else {
                            console.log(response);
                            result.textContent = json.message;
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                        result.textContent = 'Algo salió mal, inténtalo más tarde o contáctame directamente.';
                    })
                    .then(() => {
                        form.reset();
                        form.classList.remove("was-validated");
                        result.textContent = 'Gracias por escribirme, pronto me estaré poniendo en contacto :)';
                        setTimeout(() => {
                            result.classList.add("hidden")
                        }, 4000);
                    });
            }
            form.classList.add("was-validated");
        },
            false
        );
    }
})();
