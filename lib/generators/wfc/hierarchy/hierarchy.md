Смотри, роли можно разложить так:

```txt
SemanticHierarchy
  -> SemanticGraph
  -> SemanticModuleIndex
  -> SemanticLayout
  -> RuntimeSlot[]
  -> Solver
```

**1. `SemanticHierarchy`**

Это просто входные данные. Не граф, не модули, не runtime.

```ts
{
    levels: [
        ["genre1", "genre2"],
        ["intro", "verse"],
    ],
    values: ["C", "Am", "F", "G"],
}
```

Смысл: “эта последовательность значений существует во всех комбинациях этих уровней”.

Разворачивается в:

```txt
genre1/intro -> C Am F G
genre1/verse -> C Am F G
genre2/intro -> C Am F G
genre2/verse -> C Am F G
```

**2. `SemanticGraph`**

Это уже техническое дерево/DAG из hierarchy.

Он отвечает только за структуру:

```txt
root
  genre1
    intro
      C
      Am
      F
      G
    verse
      C
      Am
      F
      G
  genre2
    intro
      C
      Am
      F
      G
```

То есть `SemanticGraph` знает `nodeId`, parents/children/leaves. Но он не должен знать слова `genre`, `section`, `chords`.

**3. `SemanticModuleIndex`**

Это мост между semantic graph и runtime-модулями.

Он отвечает:

```txt
graph leaf node -> module id
module id -> graph leaf node
semantic node -> ModuleSet всех leaf-модулей под ним
module id -> value label, например "C"
```

Если `SemanticGraph` отвечает “где что лежит”, то `SemanticModuleIndex` отвечает “какие runtime-модули соответствуют этим листьям”.

**4. `SemanticLayout`**

Это запрос на генерацию:

```ts
[
    { path: ["genre1", "intro"], length: 4 },
    { path: ["genre2", "verse"], length: 8 },
]
```

Он говорит: “мне нужно столько-то слотов из этой semantic-ветки”.

**5. `RuntimeSlot[]`**

Это уже плоская WFC-модель:

```txt
slot 0: domain = modules from genre1/intro
slot 1: domain = modules from genre1/intro
slot 2: domain = modules from genre2/verse
...
```

Тут уже нет `genre`, `intro`, `levels`. Только `ModuleSet`, соседи, health.

То есть коротко:

```txt
SemanticHierarchy = что существует
SemanticGraph = где это лежит в дереве
SemanticModuleIndex = какие runtime-модули соответствуют semantic-узлам
SemanticLayout = что хотим сгенерировать
RuntimeSlot[] = во что это скомпилировалось для WFC
```

И эта модель хороша тем, что она не фиксирует два уровня. Сегодня:

```ts
levels: [["genre"], ["section"]]
```

Завтра:

```ts
levels: [["genre"], ["mood"], ["section"]]
```

И пайплайн не должен принципиально измениться.