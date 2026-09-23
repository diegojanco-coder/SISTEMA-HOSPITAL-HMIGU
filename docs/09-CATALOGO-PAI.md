# Ampliación del catálogo PAI — 14 de septiembre de 2026

El catálogo base incorpora ocho vacunas y dieciocho dosis: pentavalente, SRP, neumococo, fiebre amarilla infantil, VPH, BCG, IPV y bOPV. Es un subconjunto de la pauta ordinaria; todavía no describe todo el PAI ni las excepciones individuales.

## Nuevas pautas

| Vacuna | Seguimiento configurado | Límite del alcance |
| --- | --- | --- |
| Fiebre amarilla | Una dosis a los 12 meses; margen operativo de seguimiento de 30 días | Desde 12 meses hasta antes de cumplir 24 meses |
| VPH | Una dosis, con evaluación al contacto y revisión de antecedentes | Femenino: desde 10 hasta antes de 15 años; masculino: desde 10 hasta antes de 11 años |
| BCG | Una dosis en recién nacido | Desde nacimiento hasta antes de cumplir un año; excepciones requieren evaluación clínica |
| IPV | Posiciones 1 y 3 de la serie antipolio; edades ordinarias de 2 y 6 meses | Antes de cumplir cinco años; lote propio IPV |
| bOPV | Posiciones 2, 4 y 5; edades ordinarias de 4 y 18 meses y 4 años | Antes de cumplir cinco años; lote propio bOPV |

Los límites expresados en meses son una traducción de las edades publicadas, con cumpleaños calculados por calendario, no por bloques de 30 días. Salir del alcance de una regla no significa que la vacuna esté contraindicada. El margen de seguimiento no es un límite clínico universal.

VPH no recibe una fecha de atraso automática: el personal evalúa al contacto si corresponde registrarla. La aplicación queda en el historial con una única identidad de dosis para ambos grupos. La pauta ordinaria no describe casos de inmunocompromiso/VIH ni sustituye una revisión de contraindicaciones. Para fiebre amarilla, viajeros y recuperación fuera del rango infantil requieren evaluación separada.

## Fuentes oficiales y decisiones

- [Ministerio, 8 de julio de 2025](https://www.minsalud.gob.bo/8733-ministerio-de-salud-reitera-que-la-libreta-de-salud-y-carnet-de-vacunacion-son-gratuitos): fiebre amarilla a los 12 meses. No se reutiliza su referencia a intervalos de SRP durante el brote para modificar SRP regular.
- [Ministerio, 4 de septiembre de 2024](https://www.minsalud.gob.bo/8296-salud-insta-a-intensificar-la-vacunacion-oportuna-contra-la-fiebre-amarilla-una-dosis-confiere-inmunidad-de-por-vida): una dosis de fiebre amarilla en el esquema infantil de 12 a 23 meses; separa el criterio de viaje a zonas endémicas.
- [Ministerio, 4 de febrero de 2026](https://www.minsalud.gob.bo/9020-campana-de-prevencion-contra-el-cancer-buscara-incentivar-la-deteccion-temprana-de-la-enfermedad): VPH para niñas de 10 a 14 años y niños de 10 años.
- [Plan Nacional de Respuesta contra el Cáncer 2026–2030, publicación 581, página 45](https://minsalud.gob.bo/component/jdownloads/?Itemid=706&catid=53&id=1007%3Aplan-nacional-de-respuesta-contra-el-cancer-2026-2030&task=download.send): dosis única de VPH integrada al calendario nacional. [Antecedente ministerial de abril de 2024](https://www.minsalud.gob.bo/8088-gobierno-inicia-historica-vacunacion-contra-el-virus-del-papiloma-humano-a-ninas-de-10-a-14-anos-y-ninos-de-10-anos) explica la incorporación de niños de 10 años al esquema regular.
- [OMS, recomendaciones de enero de 2025](https://cdn.who.int/media/docs/default-source/immunization/immunization_schedules/table_1_january_2025_web_english.pdf): distingue pautas para inmunocompromiso/VIH. No se generaliza la dosis única a ese subgrupo.

La ampliación temporal de VPH para niños de 11 a 14 años de 2025 no se arrastra a 2026. No se inventan fechas de cierre de campañas. Rotavirus, influenza, dT, esquemas adultos y recuperación siguen pendientes de completar en el motor.

El 13 de septiembre se examinó el [manual SEDES gestión 2025, publicación 15](https://www.sedeslapaz.gob.bo/wp-content/uploads/2025/12/MANUAL-S.S.S.R.O.-GESTION-2025-FINAL.pdf), incluida su portada y tablas completas. El capítulo procede del PAI 2022: no reemplaza actualizaciones posteriores como VPH. La tabla 2, página PDF 257, respalda BCG antes del primer cumpleaños.

Ese documento distingue IPV a 2 y 6 meses de bOPV a 4 y 18 meses y 4 años. El motor ahora enlaza esos antecedentes y conserva el stock separado. Para rotavirus publica 2 y 4 meses y permite completar antes de un año, sin aclarar aquí el límite de inicio. dT depende de los antecedentes de pentavalente; no corresponde agregar una serie fija a todos los adultos. Estas condiciones quedan identificadas para completar la implementación y revisión clínica.

## Seguimiento antipolio

La tabla 2 (página PDF 257) define esta secuencia:

| Posición | Formulación | Origen de la fecha programada |
| --- | --- | --- |
| 1 | IPV | Nacimiento + 2 meses |
| 2 | bOPV | Aplicación registrada de IPV 1 + 2 meses |
| 3 | IPV | Aplicación registrada de bOPV 2 + 2 meses |
| 4 | bOPV | Aplicación registrada de IPV 3 + 12 meses |
| 5 | bOPV | Aplicación registrada de bOPV 4 + 30 meses |

El documento los denomina **intervalos óptimos**. Se utilizan para programar la pauta ordinaria y comprobar su fecha configurada, sin declararlos mínimos biológicos universales: `intervalo_minimo_dias` permanece en cero. Una recuperación individual que requiera otra pauta necesita evaluación clínica y una regla expresamente revisada. Un antecedente tardío desplaza el seguimiento; no se sustituye por la edad nominal. Si falta el antecedente o aparece duplicado, el sistema pide revisión. La salida del alcance de edad no constituye una contraindicación.

IPV y bOPV tienen vacunas y lotes distintos. Sus números de dosis representan posiciones de la serie completa; por eso no son consecutivos dentro de cada formulación. La creación manual propone el número máximo existente más uno. Al corregir una aplicación, se comprueba también la fecha de la dosis dependiente de la otra vacuna, sin volver a descontar existencias.

## Administración y carga

En Configuración, el editor permite diferenciar rangos por sexo registrado. Al habilitarlo debe incluir al menos un grupo. Las edades generales y las específicas se cumplen simultáneamente. Un paciente sin sexo registrado requiere revisión; un grupo excluido aparece fuera de alcance. Las reglas anteriores sin esta propiedad conservan su comportamiento.

Para enlazar otra formulación se activa **Seleccionar dosis anterior de otra vacuna** y se elige el antecedente por vacuna y nombre de dosis. Cambiar esa opción borra la selección para evitar una referencia accidental. El servidor comprueba cada enlace, rechaza ciclos y guarda versión y auditoría juntas. La consulta muestra el antecedente completo y el intervalo programado.

`npm run catalogo:base` agrega solo vacunas/dosis ausentes, en una transacción con auditoría. Conserva vacunas inactivas, reglas administradas, identidades e historial. En una instalación que ya tenga VPH o fiebre amarilla, no reemplaza la pauta anterior: el administrador debe revisarla expresamente en el editor. No elimina dosis históricas ni crea inventario.

La carga resuelve las referencias IPV/bOPV antes de confirmar la transacción. Un antecedente inactivo, una coincidencia ambigua de nombres/códigos que fusionaría formulaciones o un fallo de auditoría aborta la carga completa. Las lecturas de antecedentes se bloquean durante esa transacción. Una segunda ejecución no duplica dosis ni reemplaza ajustes existentes.

Las pruebas usan datos ficticios, transacciones revertidas o una base temporal propia. El resultado técnico no equivale a aprobar clínicamente el catálogo completo. Los correos automáticos permanecen desactivados.

## Revisión de criterios pendientes del 14 de septiembre

La [nota SEDES de julio de 2022](https://www.sedeslapaz.gob.bo/todo-lo-que-debes-saber-sobre-las-vacunas-que-necesita-un-nino-nina-y-adolescente-desde-los-0-a-los-18-anos/) sitúa la primera dosis de rotavirus entre 2 y 3 meses y la segunda entre 4 y 7. El manual SEDES gestión 2025 permite completar antes de un año, pero no aclara expresamente el inicio tardío. No se extendió automáticamente la ventana de inicio a partir de ese dato. Los antecedentes externos documentados ya pueden registrarse para las dosis del catálogo; el flujo y sus límites se explican en `11-ANTECEDENTES-EXTERNOS.md`.
