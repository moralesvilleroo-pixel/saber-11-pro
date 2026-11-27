-- GENERADO por scripts/generate-seed.mjs desde docs/MBE_TAXONOMIA.json. No editar a mano.
begin;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.LOC', 'Identificar y entender los contenidos locales que conforman un texto', 'Comprender el significado de palabras, expresiones y frases que aparecen explícitamente en el texto.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.GLO', 'Comprender cómo se articulan las partes de un texto para darle un sentido global', 'Comprender cómo se relacionan formal y semánticamente los elementos locales que constituyen un texto.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('LC', 'LC.REF', 'Reflexionar a partir de un texto y evaluar su contenido', 'Enfrentar un texto críticamente.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
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
insert into public.competencies (subject_code, code, name, description) values ('MA', 'MA.FOR', 'Formulación y ejecución', 'Plantear y ejecutar estrategias y solucionar problemas en diversos contextos.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('MA', 'MA.ARG', 'Argumentación', 'Validar o refutar conclusiones, estrategias, soluciones, interpretaciones y representaciones en diversas situaciones.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
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
insert into public.competencies (subject_code, code, name, description) values ('SC', 'SC.PER', 'Interpretación y análisis de perspectivas', 'Analizar problemas sociales desde las perspectivas de los posibles involucrados y analizar fuentes y argumentos enmarcados en problemáticas sociales.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('SC', 'SC.SIS', 'Pensamiento reflexivo y sistémico', 'Reconocer distintas formas de aproximarse a los problemas sociales, identificar la complejidad de sus relaciones y adoptar posturas críticas sobre los usos de las ciencias sociales.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.USO', 'Uso comprensivo del conocimiento científico', 'Comprender y usar conceptos, teorías y modelos para solucionar problemas.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.EXP', 'Explicación de fenómenos', 'Analizar críticamente argumentos y modelos que explican fenómenos.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
insert into public.competencies (subject_code, code, name, description) values ('CN', 'CN.IND', 'Indagación', 'Reconocer preguntas y procedimientos adecuados, y buscar, seleccionar e interpretar información.')
  on conflict (code) do update set name = excluded.name, description = excluded.description;
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
