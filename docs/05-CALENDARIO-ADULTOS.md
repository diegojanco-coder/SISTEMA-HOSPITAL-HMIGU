# Calendario de adultos: estado de implementación

Revisión del 8 de septiembre de 2026.

## Evidencia localizada

- Ministerio de Salud, 12 julio 2026: el calendario abarca adultos mayores, personas con patología de base y otras poblaciones. La nota no especifica todos los intervalos. https://www.minsalud.gob.bo/9267-completar-el-esquema-nacional-de-vacunacion-nos-protege-de-19-enfermedades-inmunoprevenibles
- Influenza 2026: campaña nacional iniciada el 10 abril. No equivale a una dosis infantil atrasada desde el nacimiento ni permite deducir una fecha de cierre. https://www.minsalud.gob.bo/9110-ministerio-inicia-campana-de-vacunacion-contra-la-influenza
- Fiebre amarilla: nota ministerial del 4 septiembre 2024 diferencia el esquema infantil de la protección de viajeros a zonas endémicas. No se configura como obligación universal adulta. https://www.minsalud.gob.bo/8296-salud-insta-a-intensificar-la-vacunacion-oportuna-contra-la-fiebre-amarilla-una-dosis-confiere-inmunidad-de-por-vida
- dT adulto figura en el esquema nacional publicado en 2016. Esa referencia por sí sola no valida una pauta actual completa. https://www.minsalud.gob.bo/1333-esquema-nacional-vacuna1

## Capacidad incorporada

`regla_calendario.programacion` admite base nacimiento, contacto o dosis_previa. La última exige dosisId, valor entero no negativo y unidad dias/semanas/meses/anios. Usa exclusivamente un antecedente inequívoco del paciente. Si falta el antecedente, la fecha es nula y el estado requiere revisión. La primera dosis al contacto también requiere evaluación; no se calcula un atraso desde el nacimiento. Estas capacidades no activan ninguna pauta clínica nueva.

Se mantienen las dosis aplicadas en el historial. El correo vuelve a comprobar la programación y cancela alertas cuya fecha ya no coincide. La pantalla muestra fecha pendiente de evaluación cuando corresponde.

## Limitaciones pendientes

No se cargó un catálogo adulto como validado: faltan la pauta vigente de dT y recuperación, elegibilidad clínica (embarazo, trabajo sanitario, comorbilidad, viajes), gestión de contacto y antecedentes externos. Influenza anual necesita episodios/temporadas, pues la restricción actual paciente+dosis impide repetir la misma identidad anualmente. Actualización del 9 de septiembre: las reglas ya cuentan con editor administrativo, versionado y auditoría. El registro comprueba los intervalos configurados, pero la validación clínica completa de las pautas sigue pendiente.

Actualización del 14 de septiembre: se incorporó el registro de antecedentes externos documentados, con auditoría y sin consumo de stock local. Se conserva la identidad de la dosis y se comprueba el seguimiento; no se deducen equivalencias ni se considera que una dosis ausente en el sistema nunca se haya aplicado. Procedimiento y límites en `11-ANTECEDENTES-EXTERNOS.md`.

La [cartilla nacional de 2024](https://www.minsalud.gob.bo/images/Descarga/Cartilla%20EL%20ALTO%202024.pdf) presenta cinco dosis de dT, mientras que el [manual SEDES gestión 2025, basado en PAI 2022](https://www.sedeslapaz.gob.bo/wp-content/uploads/2025/12/MANUAL-S.S.S.R.O.-GESTION-2025-FINAL.pdf) distingue esquemas condicionados a antecedentes de pentavalente. No se encontró un algoritmo oficial reciente que resuelva todas las combinaciones. El material de [OPS Bolivia 2026](https://www.paho.org/sites/default/files/body-data/2026/04/paho-brochure-trifold-esp-bolivia-2026.pdf) señala las poblaciones generales y remite al proveedor para el esquema actualizado; no reemplaza ese algoritmo.

La separación anterior mantiene las reglas infantiles no contrastadas en menores; para adultos, las dosis sin regla explícita requieren revisión. Campañas sin fechas o territorio confirmado no se activan. No se enviaron mensajes reales durante estas pruebas.
