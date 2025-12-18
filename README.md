# Dashboard Hormigón – Paquete completo

Este paquete trae **todo lo necesario** para que tu Dashboard funcione con **desplegables** leyendo desde la hoja `DATOS` y guardando historial en `HORMIGONES` (o `REGISTRO`).

## A) Preparar la planilla (Google Sheets)
1. Sube tu archivo Excel a Google Drive
2. Ábrelo con Google Sheets (o importa el Excel como Google Sheet)
3. Verifica que existan estas hojas:
   - `DATOS`  (listas y minas/posturas)
   - `HORMIGONES` (historial)  *(si tu historial se llama `REGISTRO`, ajusta el código)*

## B) Apps Script (Web App)
1. En la planilla Google Sheets: Extensiones → Apps Script
2. Crea un archivo `Code.gs` y pega el contenido de `Code.gs` (de este paquete)
3. Reemplaza:
   - `SPREADSHEET_ID = "PEGA_AQUI_TU_SPREADSHEET_ID"`
   (El ID es lo que está entre `/d/` y `/edit` en la URL del Sheet)

4. (Opcional) Ejecuta `setupHojaRegistro()` una vez para crear encabezados básicos.

5. Deploy:
   - Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (o “Anyone within domain” si es corporativo)
   - Copia la URL que termina en `/exec`

## C) Front (index.html)
1. Abre `index.html` (de este paquete)
2. Reemplaza:
   - `SCRIPT_URL = "PEGA_AQUI_TU_URL_WEBAPP_EXEC"`
   por la URL `/exec` del deploy

3. Hospédalo:
   - GitHub Pages (recomendado)
   - o tu servidor interno

## D) ¿Qué hace?
- GET `?action=datos`:
  - Carga desplegables: Grado, Suministro, Turno, Grupo, Sala Control, Mina
  - Carga Postura según Mina
  - CNC anidado: Responsable → CNC1 → CNC2

- POST:
  - Guarda un registro en la hoja `HORMIGONES` (o `REGISTRO`)

- GET `?action=historial`:
  - Muestra los últimos registros en tabla (auditoría)

## E) Problemas típicos
- “No se pudo leer la hoja DATOS”
  - Revisa permisos del deploy
  - Revisa que el `SPREADSHEET_ID` sea correcto
  - Revisa que exista la hoja `DATOS` y no tenga espacios

