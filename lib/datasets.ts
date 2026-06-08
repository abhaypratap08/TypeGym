/**
 * datasets.ts
 * ===========
 * All text datasets used for generating typing tests.
 * These are intentionally inlined for zero network latency —
 * no fetch() call needed before a test can start.
 *
 * For a larger dataset, replace with dynamic import() or a fetch from /public/data/*.json
 */

export const WORDS_LIST: string[] = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on",
  "with","as","you","do","at","this","but","by","from","they","we","say",
  "will","my","one","all","would","there","their","what","so","up","out",
  "if","about","who","get","which","go","me","when","make","can","like",
  "time","no","just","know","take","people","into","year","your","good",
  "some","could","them","see","other","than","then","now","look","only",
  "come","its","over","think","also","back","after","use","two","how",
  "our","work","first","well","way","even","new","want","because","any",
  "these","give","day","most","great","between","need","large","often",
  "hand","high","place","hold","real","life","few","open","together",
  "next","white","begin","walk","group","always","music","book","until",
  "river","care","second","enough","plain","young","ready","ever","feel",
  "talk","bird","soon","body","dog","family","leave","song","door","black",
  "short","point","road","quite","small","number","off","move","kind",
  "picture","change","play","air","away","animal","house","page","letter",
  "mother","answer","found","still","learn","world","light","thought",
  "head","under","story","far","sea","draw","left","late","run","while",
  "press","close","night","side","feet","car","mile","grow","took","four",
  "carry","state","once","hear","stop","without","later","idea","face",
  "watch","almost","above","sometimes","cut","list","color","stand","sun",
  "fish","area","mark","horse","complete","room","since","piece","told",
  "usually","reach","mountain","start","city","earth","eye","keep","tree",
  "never","cross","farm","hard","form","field","land","travel","true","girl",
  "north","seem","children","friend","something","plant","cover","school",
  "father","below","country","should","every","near","own","eyes","music",
  "energy","system","signal","stream","pixel","layout","motion","button",
  "cursor","window","screen","header","footer","client","server","bundle",
  "syntax","object","string","number","boolean","method","return","import",
  "export","module","native","static","dynamic","render","deploy","branch",
  "commit","review","update","format","script","helper","engine","result",
  "metric","timing","memory","thread","buffer","socket","schema","parser",
  "filter","search","select","toggle","border","shadow","radius","canvas",
  "target","resize","scroll","vector","signal","latency","worker","queue",
  "cache","token","prompt","author","design","system","intent","visual",
  "contrast","accent","glow","theme","tablet","mobile","desktop","layout",
  "rhythm","motion","stagger","timing","smooth","bold","focus","clarity",
  "launch","sprint","repair","polish","refine","iterate","extend","guard",
  "stable","simple","faster","cleaner","better","sharper","global","local",
  "random","sample","repeat","unique","common","rarely","wisdom","craft",
  "habit","muscle","memory","practice","lesson","effort","stamina","tempo",
  "rhythm","accuracy","mistake","progress","improve","master","steady","quick",
  "signal","notice","future","reason","insight","curious","invent","explore",
  "create","build","shape","learned","solved","tested","driven","calmly",
  "proper","usable","readable","visible","center","inline","direct","honest",
  "modern","useful","robust","secure","exact","spirit","bright","subtle",
  "silver","cobalt","amber","forest","ember","violet","slate","cloud",
  "storm","ocean","meadow","granite","copper","neon","plasma","rocket",
  "planet","orbit","signal","comet","module","kernel","binary","vector",
  "matrix","lambda","cursor","packet","daemon","syntax","git","react","next",
  "tailwind","framer","typescript","javascript","python","golang","rust",
  "debug","compile","runtime","staging","preview","vercel","github","issue",
  "merge","commit","release","hotfix","feature","branching","quality","reviewer",
]

export const QUOTES_LIST: string[] = [
  "The only way to do great work is to love what you do.",
  "In the middle of every difficulty lies opportunity.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Code is like humor. When you have to explain it, it is bad.",
  "First solve the problem then write the code.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "Programming is not about typing, it is about thinking.",
  "The best error message is the one that never shows up.",
  "Make it work, make it right, make it fast.",
  "Simplicity is the soul of efficiency.",
  "Talk is cheap. Show me the code.",
  "Programs must be written for people to read, and only incidentally for machines to execute.",
  "The most powerful tool we have as developers is automation.",
  "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.",
  "Every great developer you know got there by solving problems they were unqualified to solve until they did it.",
  "The function of good software is to make the complex appear to be simple.",
  "One of the best programming skills you can have is knowing when to walk away and let your brain rest.",
  "Clean code always looks like it was written by someone who cares.",
]

export const CODE_SNIPPETS = {
  javascript: [
    "const sum = (a, b) => a + b; const result = sum(3, 4);",
    "function isPrime(n) { for (let i = 2; i < n; i++) if (n % i === 0) return false; return n > 1; }",
    "const unique = arr => [...new Set(arr)]; const doubled = arr.map(x => x * 2);",
    "async function getData(url) { const res = await fetch(url); return await res.json(); }",
    "const clamp = (val, min, max) => Math.min(Math.max(val, min), max);",
  ],
  python: [
    "def fib(n): a, b = 0, 1; out = []; while len(out) < n: out.append(a); a, b = b, a + b; return out",
    "def is_palindrome(text): cleaned = ''.join(ch.lower() for ch in text if ch.isalnum()); return cleaned == cleaned[::-1]",
    "nums = [1, 2, 3, 4]; squared = [n * n for n in nums]",
    "def group_by(items, key): result = {}; for item in items: result.setdefault(item[key], []).append(item); return result",
    "def clamp(value, low, high): return max(low, min(value, high))",
  ],
  java: [
    "public static int sum(int a, int b) { return a + b; } int result = sum(3, 4);",
    "public static boolean isEven(int n) { return n % 2 == 0; }",
    "List<Integer> nums = Arrays.asList(1, 2, 3); nums.replaceAll(n -> n * 2);",
    "Map<String, Integer> counts = new HashMap<>(); counts.put(\"red\", counts.getOrDefault(\"red\", 0) + 1);",
    "String reversed = new StringBuilder(\"typegym\").reverse().toString();",
  ],
  c: [
    "int sum(int a, int b) { return a + b; } int result = sum(3, 4);",
    "for (int i = 0; i < n; i++) { total += values[i]; }",
    "char word[] = \"type\"; printf(\"%s\\n\", word);",
    "if (count > limit) { count = limit; }",
    "int max(int a, int b) { return a > b ? a : b; }",
  ],
  cpp: [
    "int sum(int a, int b) { return a + b; } int result = sum(3, 4);",
    "std::vector<int> nums = {1, 2, 3}; for (int &n : nums) { n *= 2; }",
    "std::string s = \"typegym\"; std::reverse(s.begin(), s.end());",
    "auto is_even = [](int n) { return n % 2 == 0; };",
    "std::map<std::string, int> counts; counts[\"blue\"]++;",
  ],
} as const

export type CodeLanguage = keyof typeof CODE_SNIPPETS
