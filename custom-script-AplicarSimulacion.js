// ============================================================
// Custom Script: AplicarSimulacion
// Llamar desde el Greeting action del bot con /Tool.
// Lee https://divinaseguroszoomdemo.netlify.app/api/simulacion?src=bot
// y fija las variables de zcc_call_control.
// ============================================================

// ?src=bot hace que el formulario muestre "Última lectura del bot"
var API_URL = "https://divinaseguroszoomdemo.netlify.app/api/simulacion?src=bot";
var P = "global_custom.zcc_call_control.";

function aplicar(data) {
  var bypass = data ? String(data.ByPassSystemDate || "false").toLowerCase() : "false";
  var date   = data ? String(data.date || "") : "";
  var hour   = data ? String(data.hour || "") : "";

  var dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
  var hourOk = /^\d{2}:\d{2}:\d{2}$/.test(hour);

  if (bypass === "true" && dateOk && hourOk) {
    // Simulación activa: valores del formulario
    var_set(P + "ByPassSystemDate", "true");
    var_set(P + "date", date);
    var_set(P + "hour", hour);
  } else {
    // Apagada, datos inválidos o API caída: hora real del sistema
    var_set(P + "ByPassSystemDate", "false");
  }
}

try {
  if (typeof fetch === "function") {
    // Opción 1: el propio script llama a la API
    fetch(API_URL, { method: "GET", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(aplicar)
      .catch(function () { aplicar(null); });
  } else {
    // Opción 2: la API Call "ObtenerSimulacion" (URL con ?src=bot) ya cargó estas variables
    aplicar({
      ByPassSystemDate: var_get("sim_bypass"),
      date: var_get("sim_date"),
      hour: var_get("sim_hour")
    });
  }
} catch (e) {
  aplicar(null);
}
