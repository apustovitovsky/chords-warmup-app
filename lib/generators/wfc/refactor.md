Проблема не в самом WFC-algorithm (runtime по сути нормальный порт из C#), а в compile-слое: из SemanticHierarchy собирается runtime, и этот путь размазан по нескольким файлам с дублированием и смешанными ответственностями.

Что сейчас мешает
1. Нет одного «конвейера компиляции»
Smoke-тесты повторяют одно и то же вручную:


createSemanticSlotHealthSmoke.ts
Lines 9-16
const semanticGraph = createSemanticGraph(chordPatternLibrary);
const moduleIndex = createSemanticModuleIndex(chordPatternLibrary, semanticGraph);
const layout = createSemanticLayout(
    chordPatternSegments,
    semanticGraph,
    { supportOverlap: 1 }
);
const runtimeData = createRuntimeData(layout, moduleIndex);
Пять шагов, пять точек, где можно перепутать порядок или передать несогласованные данные. Отсюда ощущение шума: нет одной входной точки «собери задачу WFC».

2. Одни и те же данные обходятся три раза
Проход	Где	Что делает
1
createSemanticGraph
hierarchy → дерево
2
configureNeighbors
hierarchy снова → possibleNeighbors
3
SemanticNeighborContext
neighbors снова → веса по string-тегам
4
RuntimeCompiler
веса снова → transitionWeights[][]
Иерархия читается многократно, а результат каждый раз в другом формате.

3. Граница hierarchy ↔ runtime размыта
graphModuleBuilder.ts одновременно:

обходит semantic graph;
создаёт runtime Module;
настраивает соседей из patterns.
Hierarchy-слой не должен знать про Module, ModuleSet, Direction — это артефакты solver'а.

4. Дублирование без абстракции
getGraphNodeIdByPath и getNodeIdByPath — одна и та же логика в двух файлах:


graphModuleBuilder.ts
Lines 167-191
function getGraphNodeIdByPath(
    semanticGraph: SemanticGraph,
    path: string[]
): number {
    // ... walk root → children by payload
}

semanticLayoutBuilder.ts
Lines 104-128
    private getNodeIdByPath(
        semanticGraph: SemanticGraph,
        path: string[]
    ): number {
        // ... то же самое
    }
5. Лишние промежуточные сущности
SemanticGraph = { graph: Graph<string> } — обёртка почти без смысла.
SemanticNeighborContext — строит веса по строковым тегам, хотя дальше всё работает с module id; потом RuntimeCompiler складывает два контекста. Лишний слой и лишние Map'ы.
SemanticModuleIndex — и индекс, и фабрика контекстов, и хранилище graph.
6. RuntimeCompiler делает слишком много semantic-работы
Компилятор слотов знает про SemanticLayout, supportNodeIds, overlap, neighbor context — это compile-time, не runtime. Отсюда вложенные циклы и проверки в одном классе.

К чему стоит прийти
Ориентир — как в docs/hierarchical-wfc: отдельные фазы с замороженным результатом, без повторных обходов.

Input — только данные
Compile — один проход
Solve — чистый WFC
SemanticLibrarypatterns + segments
SemanticGraph + PathIndex
TileSetmodules + allowed transitions
SlotLayout1D slots + support zones
CompiledRuntimeslots prebuilt
PropagationSolver
CollapseSolver
Правило: runtime/ импортирует только CompiledRuntime (или RuntimeData). Никаких SemanticHierarchy, SemanticGraph, path: string[].

Предлагаемая структура папок
lib/generators/wfc/
  semantic/                    # только домен и дерево
    types.ts                   # SemanticLibrary, Pattern, Segment
    expandLevels.ts
    graph.ts                   # Graph + GraphBuilder (generic tree)
    buildGraph.ts              # library → SemanticGraph
    resolvePath.ts             # ОДИН resolvePath(graph, path)
  compile/                     # library → runtime-ready
    buildTileSet.ts            # graph + patterns → modules + transitions
    buildLayout.ts             # segments + graph → SemanticLayout
    buildRuntime.ts            # layout + tileSet → RuntimeData
    compileSemanticWfc.ts      # единая точка входа
  runtime/                     # без изменений по сути
  smoke/
Корневые graphModuleBuilder.ts, semanticNeighborContext.ts, semanticModuleIndex.ts — либо удалить, либо превратить в thin re-exports на переходный период.

Как упростить модель данных
A. Разделить «дерево» и «паттерны»
Сейчас SemanticHierarchy смешивает таксономию и последовательности:

// было
{ levels: [["genre1","genre2"], ["intro","verse"]], values: ["C","Am","F","G"] }
// яснее
interface SemanticLibrary {
  taxonomy: TaxonomyNode[];           // дерево жанр → секция
  patterns: Pattern[];                // path + valueSequence
  layout: SegmentDefinition[];        // что генерируем
}
Тогда buildGraph строит дерево из taxonomy, buildTileSet — transitions из patterns. Каждый файл делает одно.

B. TileSet вместо Module + NeighborContext + weights
Один артефакт компиляции:

interface TileSet {
  readonly tileCount: number;
  readonly tagByTileId: readonly string[];
  readonly allowedNext: ModuleSet[];   // или sparse transitions
  readonly transitionWeight: number[][]; // optional, precomputed once
  maskForNode(nodeId: number): ModuleSet;
}
SemanticNeighborContext исчезает — веса считаются один раз в buildTileSet, не per-slot при компиляции runtime.

C. Layout — только геометрия слотов
interface SlotLayout {
  slots: { domainNodeId: number; supportNodeIds: number[] }[];
}
Без SemanticGraph внутри builder'а — только PathIndex.resolve() и список сегментов.

D. Единая точка входа
function compileSemanticWfc(library: SemanticLibrary, options?: { supportOverlap: number }) {
  const graph = buildGraph(library.taxonomy, library.patterns);
  const tileSet = buildTileSet(graph, library.patterns);
  const layout = buildLayout(graph, library.layout, options);
  const runtimeData = buildRuntime(layout, tileSet);
  return { graph, tileSet, layout, runtimeData };
}
Smoke-тесты и будущий генератор аккордов вызывают одну функцию.

Что делать по шагам (без big bang)
Шаг	Действие	Риск
1
Вынести resolvePath в один файл, заменить дубликаты
низкий
2
Добавить compileSemanticWfc, smoke перевести на него
низкий
3
Вынести buildTileSet из graphModuleBuilder, убрать SemanticModuleIndex
средний
4
Упростить RuntimeCompiler: принимает TileSet + SlotLayout, без semantic-типов
средний
5
Удалить SemanticNeighborContext, веса только в tileSet
средний
6
(опционально) разделить taxonomy / patterns в типах данных
низкий, но ломает smoke data
Runtime (PropagationSolver, CollapseQueue, ModuleHealth) не трогать — он уже выделен и понятен.

Чего не делать
Не тащить backtracking/Unity-специфику в semantic-слой — это solve-time.
Не добавлять новые обёртки вроде SemanticGraph без поведения.
Не компилировать transition weights per-slot в runtime — это главный источник циклов в RuntimeCompiler.
Критерий «стало понятно»
После рефактора должно быть возможно объяснить систему четырьмя фразами:

Library — что разрешено в домене (дерево + паттерны).
TileSet — конечный набор тайлов и переходов (скомпилировано один раз).
Layout — где стоят слоты и какой у них контекст support.
Runtime — чистый WFC по слотам, без знания про жанры и path.
Могу следующим шагом набросать конкретный план рефактора с diff по файлам (шаг 1–2 за один PR), или начать с compileSemanticWfc + resolvePath — это даст быстрый выигрыш без переписывания solver'а. Что предпочитаешь?


План рефактора только до границы RuntimeCompiler: runtime/ ниже компилятора (solver, slot, queues) не трогаем. RuntimeCompiler можно упростить, но его выход (RuntimeData) должен остаться тем же — иначе сломается propagation.

Граница ответственности
Рефакторим
Не трогаем
SemanticLibrary
compile pipeline
RuntimeCompiler
RuntimeData
PropagationSolver
CollapseSolver
Контракт, который нельзя ломать:

createRuntimeData(layout, index) → RuntimeData
// index должен уметь:
// - modules.length
// - getModuleMask(nodeId)
// - createNeighborContext(supportNodeIds)
Пока RuntimeCompiler не переписан — новый compile-слой обязан выдавать совместимый SemanticModuleIndex (или thin-adapter с тем же API).

Целевая структура (верхний слой)
lib/generators/wfc/
  semantic/
    types.ts              # SemanticLibrary, Pattern, Segment
    expandLevels.ts       # из semanticHierarchy.ts
    graph/                # graph.ts, graphBuilder.ts (generic tree)
    resolvePath.ts        # один resolvePath(graph, path)
    buildGraph.ts         # library → graph (+ path index)
  compile/
    buildTileSet.ts       # graph + patterns → Module[] + neighbors
    buildLayout.ts        # segments → SemanticLayout
    buildModuleIndex.ts   # tileSet + graph → SemanticModuleIndex
    compileSemanticWfc.ts # единая точка входа
  runtime/
    runtimeCompiler.ts    # можно упростить на финальном шаге
    ...                   # всё остальное frozen
Корневые graphModuleBuilder.ts, semanticLayoutBuilder.ts, semanticModuleIndex.ts, semanticNeighborContext.ts — убрать после миграции (или оставить re-export на 1 PR).

Фазы (маленькие PR, smoke после каждого)
PR 1 — Зафиксировать поведение
Цель: рефактор без сюрпризов.

Прогнать все smoke:wfc:*, сохранить эталонный вывод (или snapshot ключевых строк).
Добавить один assert-smoke: compile → createRuntimeData → CollapseSolver даёт полный collapse без ошибок (уже есть в createCollapseSolverSmoke.ts — использовать как gate).
Файлы: только smoke, без логики.

PR 2 — resolvePath (убрать первое дублирование)
Цель: один способ ходить по дереву.

Действие	Файл
Создать
semantic/resolvePath.ts
Заменить
graphModuleBuilder.getGraphNodeIdByPath
Заменить
semanticLayoutBuilder.getNodeIdByPath
// semantic/resolvePath.ts
export function resolvePath(graph: Graph<string>, path: string[]): number
Не менять: сигнатуры публичных createSemanticGraph, createSemanticLayout, createSemanticModuleIndex.

Проверка: все smoke зелёные, diff только import path.

PR 3 — compileSemanticWfc (единая точка входа)
Цель: убрать 5-строчный boilerplate из smoke.

Создать	compile/compileSemanticWfc.ts
export interface CompileSemanticWfcInput {
  library: SemanticHierarchy;
  segments: SemanticSegmentDefinition[];
  supportOverlap?: number;
}
export interface CompiledSemanticWfc {
  graph: SemanticGraph;
  layout: SemanticLayout;
  moduleIndex: SemanticModuleIndex;
}
export function compileSemanticWfc(input): CompiledSemanticWfc
Внутри — текущие три вызова без изменения логики:

createSemanticGraph
createSemanticModuleIndex
createSemanticLayout
Smoke: импорт только compileSemanticWfc.

RuntimeCompiler: не трогаем.

PR 4 — Разделить graphModuleBuilder на фазы
Цель: один файл = одна ответственность, без смешения graph / tileSet / index.

Новый файл	Ответственность	Из
compile/buildTileSet.ts
leaf nodes → Module[], configureNeighbors
createGraphModules, configureNeighbors, configurePathNeighbors
compile/buildModuleIndex.ts
GraphModuleMap → SemanticModuleIndex
createSemanticModuleIndex
semantic/buildGraph.ts
hierarchy → SemanticGraph
hierarchy/semanticGraph.ts
Порядок внутри compile:

buildGraph(library)
  → buildTileSet(graph, library.patterns)
  → buildModuleIndex(graph, tileSet)
Важно: buildTileSet всё ещё создаёт runtime Module — это нормально на этой границе; главное, что hierarchy больше не размазана по layout builder.

Удалить: логику из graphModuleBuilder.ts (оставить re-export createSemanticModuleIndex → buildModuleIndex).

Проверка: smoke + сравнение moduleIndex.modules и layout.slots с PR 3 (deep equal по id/tag/neighbors).

PR 5 — buildLayout без знания hierarchy
Цель: layout зависит только от graph + segments.

Перенести	semanticLayoutBuilder.ts → compile/buildLayout.ts
Зависимости
resolvePath, SemanticLayout types
Убрать
класс SemanticLayoutBuilder → простая функция buildLayout
buildLayout(
  graph: Graph<string>,
  segments: SemanticSegmentDefinition[],
  options: { supportOverlap: number }
): SemanticLayout
SemanticGraph-обёртку можно оставить в input compile, но builder принимает Graph<string>.

PR 6 — Упростить SemanticModuleIndex + SemanticNeighborContext
Цель: убрать лишний слой string→string Map, не меняя поведение.

Сейчас цепочка:

possibleNeighbors → SemanticNeighborContext (tag maps) → RuntimeCompiler суммирует 2 контекста
Шаг 6a (безопасный): перенести классы в compile/:

compile/moduleIndex.ts (бывший semanticModuleIndex.ts)
compile/neighborContext.ts (бывший semanticNeighborContext.ts)
Шаг 6b (опционально в этом же PR или отдельно): заменить tag-based maps на precomputed lookup:

// neighborContext хранит только moduleId → weight для direction
getTransitionWeight(fromId, toId, direction): number
Реализация: при создании контекста один раз пройти supportNodeIds × modules × neighbors — без Map<string, Map<string, number>>.

RuntimeCompiler: без изменений, если API createNeighborContext / getTransitionWeight тот же.

PR 7 — (опционально) упростить RuntimeCompiler
Это единственное изменение на границе с runtime. Solver не трогаем.

Цель: compiler не знает про SemanticGraph, hierarchy, path.

Два варианта — выбери один:

Вариант A — минимальный (рекомендую сначала):

Оставить сигнатуру:

createRuntimeData(layout, moduleIndex)
Только почистить RuntimeCompiler: вынести hasSharedSupportContext, getNeighborIndices в compile/slotTopology.ts — compiler импортирует готовую топологию слотов.

Вариант B — сильнее:

Новый input:

interface CompiledSlotBlueprint {
  domainMask: ModuleSet;
  neighborIndices: [number | null, number | null];
  supportContext: SemanticNeighborContext; // или TransitionTable
}
createRuntimeData(blueprints: CompiledSlotBlueprint[], moduleCapacity): RuntimeData
Тогда compileSemanticWfc возвращает { layout, blueprints, moduleCapacity }, а RuntimeCompiler — тонкий mapper в RuntimeSlot.

Frozen: RuntimeSlot, PropagationSolver, CollapseSolver — без изменений.

PR 8 — Типы library (косметика, когда compile стабилен)
Цель: явное разделение данных, без смены JSON-формата smoke data.

interface SemanticLibrary {
  patterns: SemanticPattern[];  // было SemanticHierarchy.patterns
}
// segments живут отдельно в CompileSemanticWfcInput
SemanticHierarchy → type alias на SemanticLibrary для обратной совместимости.

Что сознательно не делаем (в этом плане)
Не трогаем	Почему
PropagationSolver, CollapseQueue, RemovalQueue
runtime frozen
ModuleSet, RuntimeSlot, moduleHealth
порт C#, работает
Backtracking / random collapse
solve-time, не compile
docs/ референсы
только ориентир
Порядок и риски
PR1 gate → PR2 resolvePath → PR3 compile entry
    → PR4 tileSet split → PR5 layout
    → PR6 neighborContext cleanup
    → PR7 RuntimeCompiler (optional)
    → PR8 types rename
PR	Риск	Откат
1–3
низкий
trivial
4–5
средний
сравнение tileSet/layout snapshot
6
средний
golden weights на пару slot pairs
7
выше
обязательно collapse-solver + collapse-pipeline smoke
Критерий «готово»
После PR 3–6 код читается так:

compileSemanticWfc — единственный public API верхнего слоя.
buildGraph — только дерево.
buildTileSet — только модули и переходы (один проход по patterns).
buildLayout — только слоты и support zones.
createRuntimeData — единственный мост в runtime; ниже — frozen solver.
Рекомендуемый первый PR
PR 2 + PR 3 вместе (~200 строк): resolvePath + compileSemanticWfc + smoke на новый entry point. Почти нулевой риск, сразу меньше шума в smoke и одна точка входа для будущего генератора аккordов.

Если хочешь — могу следующим сообщением расписать конкретный diff по файлам для PR 2+3 (имена экспортов, что куда переносить, какие re-export оставить).