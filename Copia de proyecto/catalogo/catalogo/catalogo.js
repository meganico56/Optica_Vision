const btn_ham = document.getElementById("Id_ham");
const men_oc = document.getElementById("id_men_ocu");

console.log(btn_ham);
console.log(men_oc);

btn_ham.addEventListener("click", () => {
  men_oc.classList.toggle("mostrar");
});

const enlaces = document.querySelectorAll(".menu a");

enlaces.forEach((enlace) => {
  enlace.addEventListener("click", function () {
    enlaces.forEach((item) => {
      item.classList.remove("activo");
    });

    this.classList.add("activo");
  });
});

//seleccion de los enlaces del menu---------------------------------
const enlacesMenu = document.querySelectorAll(".menu_nav li a");
 
enlacesMenu.forEach(function(enlace){

  enlace.addEventListener("click", function(){

    enlacesMenu.forEach((item) => {

      item.classList.remove("activo");

    });

    this.classList.add("activo");
  });
});

// seleccion de los enlaces del catalogo----------------------------

const enlaces_catalogo = document.querySelectorAll(".botons li a");

enlaces_catalogo.forEach(function(enlace){

  enlace.addEventListener("click", function(){

    enlaces_catalogo.forEach((item) => {

      item.classList.remove("activo");

    });

    this.classList.add("activo");
  });
});

//----------------------------seleccion de los enlaces del menu hamburguesa----------------------------

const enlaces_hamburguesa = document.querySelectorAll(".men_oc ul li a");

enlaces_hamburguesa.forEach(function(enlace){

  enlace.addEventListener("click", function(){

    enlaces_hamburguesa.forEach((item) => {

      item.classList.remove("activo");

    });

    this.classList.add("activo");
  });
});
