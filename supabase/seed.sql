-- GENERADO por scripts/generate-seed.mjs desde docs/MBE_TAXONOMIA.json. No editar a mano.
begin;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.LOC', 'Identificar y ubicar información local', 'Comprender el significado de palabras, expresiones y frases que aparecen explícitamente en el texto.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'LC.A1', 'Identifica y entiende los contenidos locales que conforman un texto.' from public.competencies where code = 'LC.LOC'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E1.1', 'Entiende el significado de los elementos locales de un texto.' from public.affirmations where code = 'LC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E1.2', 'Identifica los eventos narrados explícitamente y los personajes involucrados (textos literarios, descriptivos, caricaturas o cómics).' from public.affirmations where code = 'LC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.GLO', 'Relacionar e interpretar información', 'Comprender cómo se relacionan formal y semánticamente los elementos locales que constituyen un texto.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'LC.A2', 'Comprende cómo se articulan las partes de un texto para darle un sentido global.' from public.competencies where code = 'LC.GLO'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E2.1', 'Comprende la estructura formal de un texto y la función de sus partes.' from public.affirmations where code = 'LC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E2.2', 'Identifica y caracteriza las voces o situaciones presentes en un texto.' from public.affirmations where code = 'LC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E2.3', 'Comprende las relaciones entre partes o enunciados de un texto.' from public.affirmations where code = 'LC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E2.4', 'Identifica y caracteriza las ideas o afirmaciones de un texto informativo.' from public.affirmations where code = 'LC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E2.5', 'Identifica el tipo de relación entre elementos de un texto discontinuo.' from public.affirmations where code = 'LC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.REF', 'Evaluar y reflexionar sobre la forma y el contenido de los textos', 'Enfrentar un texto críticamente.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'LC.A3', 'Reflexiona a partir de un texto y evalúa su contenido.' from public.competencies where code = 'LC.REF'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E3.1', 'Establece la validez e implicaciones de un enunciado de un texto argumentativo o expositivo.' from public.affirmations where code = 'LC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E3.2', 'Relaciona un texto con otros textos o enunciados.' from public.affirmations where code = 'LC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E3.3', 'Reconoce contenidos valorativos.' from public.affirmations where code = 'LC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E3.4', 'Reconoce estrategias discursivas.' from public.affirmations where code = 'LC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'LC.E3.5', 'Contextualiza el texto o la información que contiene.' from public.affirmations where code = 'LC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.content_components (subject_code, code, kind, name, description) values ('LC', 'LC.TXT.CONT.LIT', 'tipo_texto', 'Continuo literario', 'Cuentos, novelas.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('LC', 'LC.TXT.CONT.INF', 'tipo_texto', 'Continuo informativo', 'Ensayos, artículos de prensa.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('LC', 'LC.TXT.CONT.FIL', 'tipo_texto', 'Continuo filosófico', 'Fragmentos de textos argumentativos.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('LC', 'LC.TXT.DISC', 'tipo_texto', 'Discontinuo', 'Infografías, cómics, tablas, gráficos.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('MA', 'MA.INT', 'Interpretación y representación', 'Comprender y transformar la información, y extraer la información relevante.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'MA.A1', 'Comprende y transforma la información cuantitativa y esquemática presentada en distintos formatos.' from public.competencies where code = 'MA.INT'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E1.1', 'Da cuenta de las características básicas de la información presentada en series, gráficas, tablas o esquemas.' from public.affirmations where code = 'MA.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E1.2', 'Transforma la representación de una o más piezas de información.' from public.affirmations where code = 'MA.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('MA', 'MA.FOR', 'Formulación y ejecución', 'Plantear y ejecutar estrategias y solucionar problemas en diversos contextos.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'MA.A2', 'Diseña y ejecuta estrategias que llevan a soluciones adecuadas de problemas cuantitativos.' from public.competencies where code = 'MA.FOR'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E2.1', 'Diseña planes para resolver problemas.' from public.affirmations where code = 'MA.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E2.2', 'Ejecuta un plan de solución.' from public.affirmations where code = 'MA.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E2.3', 'Resuelve el problema.' from public.affirmations where code = 'MA.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('MA', 'MA.ARG', 'Argumentación', 'Validar o refutar conclusiones, estrategias, soluciones, interpretaciones y representaciones en diversas situaciones.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'MA.A3', 'Valida procedimientos y estrategias matemáticas usadas para resolver problemas.' from public.competencies where code = 'MA.ARG'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E3.1', 'Plantea afirmaciones que sustentan o refutan una interpretación.' from public.affirmations where code = 'MA.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E3.2', 'Argumenta a favor o en contra de un procedimiento según criterios dados.' from public.affirmations where code = 'MA.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'MA.E3.3', 'Establece la validez o pertinencia de una solución propuesta.' from public.affirmations where code = 'MA.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.content_components (subject_code, code, kind, name, description) values ('MA', 'MA.CAT.ALG', 'categoria', 'Álgebra y cálculo', 'Categoría de herramientas matemáticas.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('MA', 'MA.CAT.GEO', 'categoria', 'Geometría', 'Categoría de herramientas matemáticas.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('MA', 'MA.CAT.EST', 'categoria', 'Estadística', 'Categoría de herramientas matemáticas.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('MA', 'MA.CONT.GEN', 'tipo_contenido', 'Genérico', 'Herramientas matemáticas necesarias para interactuar de manera crítica en la sociedad.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('MA', 'MA.CONT.NOGEN', 'tipo_contenido', 'No genérico', 'Herramientas matemáticas específicas del quehacer matemático aprendidas en la etapa escolar.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('SC', 'SC.PSO', 'Pensamiento social', 'Usar conceptos básicos de las ciencias sociales para comprender problemáticas y fenómenos sociales, políticos, económicos, culturales y geográficos; comprender los principios básicos de la Constitución y el sistema político colombiano.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A1', 'Comprende modelos conceptuales, sus características y contextos de aplicación.' from public.competencies where code = 'SC.PSO'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E1.1', 'Identifica y usa conceptos básicos de las ciencias sociales (económicos, políticos, culturales y geográficos).' from public.affirmations where code = 'SC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E1.2', 'Conoce el modelo de Estado Social de Derecho y su aplicación en Colombia.' from public.affirmations where code = 'SC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E1.3', 'Conoce la organización del Estado (ramas del poder y órganos de control).' from public.affirmations where code = 'SC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E1.4', 'Conoce los mecanismos de participación ciudadana y de protección de derechos.' from public.affirmations where code = 'SC.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A2', 'Comprende dimensiones espaciales y temporales de eventos, problemáticas y prácticas sociales.' from public.competencies where code = 'SC.PSO'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E2.1', 'Ubica en el tiempo y el espacio eventos históricos y prácticas sociales.' from public.affirmations where code = 'SC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E2.2', 'Relaciona dimensiones históricas y geográficas de eventos y problemáticas.' from public.affirmations where code = 'SC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E2.3', 'Relaciona problemáticas o prácticas sociales con características del espacio geográfico.' from public.affirmations where code = 'SC.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('SC', 'SC.PER', 'Interpretación y análisis de perspectivas', 'Analizar problemas sociales desde las perspectivas de los posibles involucrados y analizar fuentes y argumentos enmarcados en problemáticas sociales.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A3', 'Contextualiza y evalúa usos de fuentes y argumentos.' from public.competencies where code = 'SC.PER'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E3.1', 'Ubica una fuente primaria en un contexto económico, político o cultural.' from public.affirmations where code = 'SC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E3.2', 'Evalúa los alcances y límites del uso de una fuente para sustentar argumentos.' from public.affirmations where code = 'SC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E3.3', 'Devela prejuicios e intenciones en enunciados o argumentos.' from public.affirmations where code = 'SC.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A4', 'Comprende perspectivas de distintos actores y grupos sociales.' from public.competencies where code = 'SC.PER'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E4.1', 'Reconoce y compara las perspectivas de actores y grupos sociales.' from public.affirmations where code = 'SC.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E4.2', 'Reconoce que cosmovisiones, ideologías y roles sociales influyen en argumentos, posiciones y conductas.' from public.affirmations where code = 'SC.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E4.3', 'Relaciona las perspectivas de los involucrados en un conflicto con las soluciones propuestas.' from public.affirmations where code = 'SC.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('SC', 'SC.SIS', 'Pensamiento reflexivo y sistémico', 'Reconocer distintas formas de aproximarse a los problemas sociales, identificar la complejidad de sus relaciones y adoptar posturas críticas sobre los usos de las ciencias sociales.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A5', 'Evalúa usos sociales de las ciencias sociales.' from public.competencies where code = 'SC.SIS'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E5.1', 'Analiza modelos conceptuales y su uso en decisiones sociales.' from public.affirmations where code = 'SC.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'SC.A6', 'Comprende que los problemas y sus soluciones involucran distintas dimensiones y reconoce relaciones entre ellas.' from public.competencies where code = 'SC.SIS'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E6.1', 'Establece relaciones entre las dimensiones presentes en una situación problemática.' from public.affirmations where code = 'SC.A6'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'SC.E6.2', 'Analiza los efectos que una intervención tendría en distintas dimensiones.' from public.affirmations where code = 'SC.A6'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.USO', 'Uso comprensivo del conocimiento científico', 'Comprender y usar conceptos, teorías y modelos para solucionar problemas.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A4', 'Asocia fenómenos naturales con conceptos científicos.' from public.competencies where code = 'CN.USO'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.1', 'Relaciona los componentes de circuitos en serie y en paralelo con sus voltajes y corrientes.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.2', 'Relaciona los factores que determinan la dinámica de un sistema (condiciones iniciales, parámetros, constantes) con su comportamiento, usando leyes de la física.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.3', 'Relaciona los tipos de energía de un objeto con las interacciones del sistema con su entorno.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.4', 'Establece relaciones entre fenómenos biológicos para comprender la dinámica de los seres vivos.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.5', 'Establece relaciones entre fenómenos biológicos para comprender el entorno.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.6', 'Diferencia tipos de reacciones químicas y hace cálculos con la conservación de la masa y la carga.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.7', 'Relaciona conceptos fisicoquímicos simples (mezclas, solubilidad, gases ideales) con fenómenos naturales.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E4.8', 'Relaciona propiedades y estructura de la materia con la formación de iones y moléculas.' from public.affirmations where code = 'CN.A4'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A5', 'Identifica características de fenómenos naturales a partir de información y conceptos científicos.' from public.competencies where code = 'CN.USO'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.1', 'Identifica características fundamentales de las ondas y las variables que las afectan en un medio.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.2', 'Identifica formas de energía en un fenómeno físico y sus transformaciones.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.3', 'Identifica los tipos de fuerzas que actúan sobre los cuerpos de un sistema.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.4', 'Identifica características de procesos en los ecosistemas.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.5', 'Identifica características de procesos en los organismos.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.6', 'Identifica propiedades y estructura de la materia y diferencia elementos, compuestos y mezclas.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E5.7', 'Reconoce posibles cambios en el ambiente por la explotación de un recurso o el uso de una tecnología.' from public.affirmations where code = 'CN.A5'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.EXP', 'Explicación de fenómenos', 'Analizar críticamente argumentos y modelos que explican fenómenos.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A1', 'Analiza el potencial uso de recursos naturales o artefactos, sus efectos en el ambiente y la salud, y las posibilidades de desarrollo de las comunidades.' from public.competencies where code = 'CN.EXP'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E1.1', 'Explica principios de salud individual y pública con base en principios biológicos, químicos y físicos.' from public.affirmations where code = 'CN.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E1.2', 'Explica efectos positivos o negativos de explotar un recurso o usar una tecnología.' from public.affirmations where code = 'CN.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E1.3', 'Explica el uso correcto y seguro de una tecnología o artefacto en un contexto específico.' from public.affirmations where code = 'CN.A1'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A2', 'Explica cómo ocurren fenómenos naturales a partir de observaciones, patrones y conceptos científicos.' from public.competencies where code = 'CN.EXP'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.1', 'Da razones de por qué una reacción describe un fenómeno usando la conservación de la masa y la carga.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.2', 'Explica cómo se diferencia la materia por su estructura y propiedades (elementos, compuestos, mezclas).' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.3', 'Reconoce atributos de procesos fisicoquímicos simples (separación de mezclas, solubilidad, gases ideales, cambios de fase).' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.4', 'Construye explicaciones que relacionan variables de estado de un sistema eléctrico con modelos básicos de circuitos.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.5', 'Construye explicaciones que relacionan variables de estado de un sistema con cinemática y dinámica newtoniana básicas.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.6', 'Construye explicaciones que relacionan variables de estado de un sistema con termodinámica básica.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.7', 'Construye explicaciones que relacionan variables de estado de un sistema con modelos básicos de ondas.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.8', 'Analiza ecosistemas, su funcionamiento, sus interrelaciones bióticas y abióticas y los efectos de cambiar una variable interna.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E2.9', 'Analiza la dinámica interna de los organismos y cómo sus componentes funcionan por separado y en conjunto para mantener la vida.' from public.affirmations where code = 'CN.A2'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A3', 'Modela fenómenos naturales analizando variables y relacionando conceptos científicos y evidencias de investigación.' from public.competencies where code = 'CN.EXP'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E3.1', 'Usa modelos físicos de dinámica clásica para comprender un fenómeno en un sistema.' from public.affirmations where code = 'CN.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E3.2', 'Identifica y usa modelos químicos para comprender fenómenos naturales.' from public.affirmations where code = 'CN.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E3.3', 'Analiza y usa modelos biológicos para comprender dinámicas de los seres vivos y su entorno.' from public.affirmations where code = 'CN.A3'
  on conflict (code) do update set statement = excluded.statement;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.IND', 'Indagación', 'Reconocer preguntas y procedimientos adecuados, y buscar, seleccionar e interpretar información.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A6', 'Comprende que la investigación científica construye explicaciones del mundo natural.' from public.competencies where code = 'CN.IND'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E6.1', 'Analiza qué tipo de pregunta puede responderse en el contexto de una investigación.' from public.affirmations where code = 'CN.A6'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E6.2', 'Reconoce la importancia de la evidencia para comprender fenómenos naturales.' from public.affirmations where code = 'CN.A6'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A7', 'Deriva conclusiones sobre fenómenos naturales a partir de conocimiento científico y evidencias propias o ajenas.' from public.competencies where code = 'CN.IND'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E7.1', 'Comunica de forma apropiada el proceso y los resultados de una investigación en ciencias naturales.' from public.affirmations where code = 'CN.A7'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E7.2', 'Determina si los resultados de una investigación son suficientes y pertinentes para concluir en una situación dada.' from public.affirmations where code = 'CN.A7'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E7.3', 'Elabora conclusiones a partir de información o evidencias que las respaldan.' from public.affirmations where code = 'CN.A7'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E7.4', 'Hace predicciones basadas en información, patrones y regularidades.' from public.affirmations where code = 'CN.A7'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A8', 'Observa y relaciona patrones en los datos para evaluar predicciones.' from public.competencies where code = 'CN.IND'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E8.1', 'Interpreta y analiza datos presentados en textos, gráficas, dibujos, diagramas o tablas.' from public.affirmations where code = 'CN.A8'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E8.2', 'Representa datos en gráficas y tablas.' from public.affirmations where code = 'CN.A8'
  on conflict (code) do update set statement = excluded.statement;
insert into public.affirmations (competency_id, code, statement) select id, 'CN.A9', 'Utiliza habilidades de pensamiento y de procedimiento para evaluar predicciones.' from public.competencies where code = 'CN.IND'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E9.1', 'Propone explicaciones posibles de eventos, coherentes con conceptos científicos.' from public.affirmations where code = 'CN.A9'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E9.2', 'Diseña experimentos para responder preguntas.' from public.affirmations where code = 'CN.A9'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E9.3', 'Elige y usa instrumentos adecuados para recolectar datos.' from public.affirmations where code = 'CN.A9'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E9.4', 'Reconoce la necesidad de registrar y clasificar la información para un buen análisis.' from public.affirmations where code = 'CN.A9'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'CN.E9.5', 'Usa información adicional para evaluar una predicción.' from public.affirmations where code = 'CN.A9'
  on conflict (code) do update set statement = excluded.statement;
insert into public.content_components (subject_code, code, kind, name, description) values ('CN', 'CN.COMP.QUI', 'componente', 'Químico', 'Cambios químicos, el átomo, tipos de enlace, propiedades de la materia, estequiometría, separación de mezclas, solubilidad, gases ideales, transformación y conservación de la energía.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('CN', 'CN.COMP.BIO', 'componente', 'Biológico', 'Homeostasis en los seres vivos, herencia y reproducción, relaciones ecológicas, evolución y transformación de la vida en el planeta, conservación de la energía.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('CN', 'CN.COMP.FIS', 'componente', 'Físico', 'Cinemática, dinámica, energía mecánica, ondas, energía térmica, electromagnetismo, campo gravitacional, transformación y conservación de la energía.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('CN', 'CN.COMP.CTS', 'componente', 'Ciencia, Tecnología y Sociedad (CTS)', 'Temáticas interdisciplinares relacionadas con las ciencias naturales, unas globales y otras locales.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('IN', 'IN.COM', 'Competencia comunicativa en lengua inglesa', 'Dar cuenta de lo que el estudiante es capaz de hacer en inglés según el MCER, a través de tareas de lectura, gramática y léxico.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.affirmations (competency_id, code, statement) select id, 'IN.A0', 'Técnica del proyecto (no oficial): el Icfes no define afirmaciones en Inglés; cada parte del examen se usa como evidencia para etiquetar ítems.' from public.competencies where code = 'IN.COM'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E1', 'Resuelve tareas de la Parte 1 del examen: Relacionar descripciones con palabras de una lista que incluye un ejemplo y palabras sobrantes.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E2', 'Resuelve tareas de la Parte 2 del examen: Decidir en qué lugar se encontraría cada aviso.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E3', 'Resuelve tareas de la Parte 3 del examen: Completar conversaciones cortas eligiendo la respuesta adecuada.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E4', 'Resuelve tareas de la Parte 4 del examen: Texto con espacios: elegir la palabra con la estructura gramatical correcta.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E5', 'Resuelve tareas de la Parte 5 del examen: Comprensión de lectura sobre un texto de nivel básico.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E6', 'Resuelve tareas de la Parte 6 del examen: Comprensión de lectura sobre un texto de nivel más complejo.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.evidences (affirmation_id, code, statement) select id, 'IN.E7', 'Resuelve tareas de la Parte 7 del examen: Texto con espacios: elegir la palabra con el significado o la estructura correcta.' from public.affirmations where code = 'IN.A0'
  on conflict (code) do update set statement = excluded.statement;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P1', 'parte', 'Parte 1', 'Relacionar descripciones con palabras de una lista que incluye un ejemplo y palabras sobrantes.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P2', 'parte', 'Parte 2', 'Decidir en qué lugar se encontraría cada aviso.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P3', 'parte', 'Parte 3', 'Completar conversaciones cortas eligiendo la respuesta adecuada.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P4', 'parte', 'Parte 4', 'Texto con espacios: elegir la palabra con la estructura gramatical correcta.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P5', 'parte', 'Parte 5', 'Comprensión de lectura sobre un texto de nivel básico.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P6', 'parte', 'Parte 6', 'Comprensión de lectura sobre un texto de nivel más complejo.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
insert into public.content_components (subject_code, code, kind, name, description) values ('IN', 'IN.P7', 'parte', 'Parte 7', 'Texto con espacios: elegir la palabra con el significado o la estructura correcta.')
  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;
commit;
