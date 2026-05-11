import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getServiceAccountCredentials } from '../src/server/googleCredentials.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const seedChaptersData = [
  // Class 3 Math
  {
    class: 'class3',
    id: 'class3_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ସଂଖ୍ୟା ପରିଚୟ (Number System)',
    status: 'published',
    notes: `### 🔢 ସଂଖ୍ୟା ପରିଚୟ (Introduction to Numbers)

ପ୍ରିୟ ପିଲାମାନେ, ଆଜି ଆମେ ତିନି ଅଙ୍କ ବିଶିଷ୍ଟ ସଂଖ୍ୟା ବିଷୟରେ ପଢ଼ିବା। 

#### ୧. ସଂଖ୍ୟା ଗଠନ:
ତିନି ଅଙ୍କ ବିଶିଷ୍ଟ ସଂଖ୍ୟାରେ ତିନୋଟି ସ୍ଥାନ ଥାଏ:
* **ଏକକ (Ones)**
* **ଦଶକ (Tens)**
* **ଶତକ (Hundreds)**

**ଉଦାହରଣ:**
$125$ ସଂଖ୍ୟାକୁ ଦେଖ:
* ଶତକ ସ୍ଥାନରେ ଅଛି $1$ (ଅର୍ଥାତ୍ ୧୦୦)
* ଦଶକ ସ୍ଥାନରେ ଅଛି $2$ (ଅର୍ଥାତ୍ ୨୦)
* ଏକକ ସ୍ଥାନରେ ଅଛି $5$ (ଅର୍ଥାତ୍ ୫)

ଏହାକୁ ଆମେ କହିବା: **ଏକ ଶହ ପଚିଶ**।

#### ୨. ବୃହତ୍ତମ ଏବଂ କ୍ଷୁଦ୍ରତମ ସଂଖ୍ୟା:
* ତିନି ଅଙ୍କ ବିଶିଷ୍ଟ କ୍ଷୁଦ୍ରତମ ସଂଖ୍ୟା ହେଉଛି $100$।
* ତିନି ଅଙ୍କ ବିଶିଷ୍ଟ ବୃହତ୍ତମ ସଂଖ୍ୟା ହେଉଛି $999$।

#### 📝 ଅଭ୍ୟାସ ପ୍ରଶ୍ନ:
$456$ ସଂଖ୍ୟାରେ ଦଶକ ସ୍ଥାନର ଅଙ୍କଟି କେତେ?
**ଉତ୍ତର:** $5$।`
  },
  {
    class: 'class3',
    id: 'class3_math_ch2',
    subject: 'math',
    board: 'bse',
    title: 'ଯୋଗ ଓ ବିୟୋଗ (Addition & Subtraction)',
    status: 'published',
    notes: `### ➕ ଯୋଗ ଓ ବିୟୋଗ (Addition and Subtraction)

ଆଜି ଆମେ ଦୁଇଟି ଓ ତିନୋଟି ସଂଖ୍ୟାର ମିଶାଣ ଏବଂ ଫେଡ଼ାଣ ପ୍ରକ୍ରିୟା ଶିଖିବା।

#### ୧. ଯୋଗ ପ୍ରକ୍ରିୟା (Addition):
ଯୋଗ କଲାବେଳେ ସର୍ବଦା ଏକକ ସ୍ଥାନରୁ ଆରମ୍ଭ କରିବା ଉଚିତ।
**ଉଦାହରଣ:**
$$\\begin{array}{r@{\\quad}l}
234 \\\\
+\\quad 145 \\\\
\\hline
379
\\end{array}$$

#### ୨. ବିୟୋଗ ପ୍ରକ୍ରିୟା (Subtraction):
ବିୟୋଗରେ ମଧ୍ୟ ପ୍ରଥମେ ଏକକ, ପରେ ଦଶକ ଓ ଶେଷରେ ଶତକ ସ୍ଥାନରୁ ବିୟୋଗ କରାଯାଏ।
**ଉଦାହରଣ:**
$$\\begin{array}{r@{\\quad}l}
578 \\\\
-\\quad 234 \\\\
\\hline
344
\\end{array}$$`
  },

  // Class 4 Math
  {
    class: 'class4',
    id: 'class4_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ଗୁଣନୀୟକ ଓ ଗୁଣିତକ (Factors & Multiples)',
    status: 'published',
    notes: `### 🧮 ଗୁଣନୀୟକ ଓ ଗୁଣିତକ (Factors and Multiples)

#### ୧. ଗୁଣନୀୟକ (Factors):
ଯେଉଁ ସଂଖ୍ୟାଗୁଡ଼ିକ ଦ୍ୱାରା ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ସଂଖ୍ୟା ସମ୍ପୂର୍ଣ୍ଣ ଭାବେ ବିଭାଜିତ ହୁଏ, ସେଗୁଡ଼ିକୁ ସେହି ସଂଖ୍ୟାର ଗୁଣନୀୟକ କୁହାଯାଏ।
* $12$ ର ଗୁଣନୀୟକଗୁଡ଼ିକ ହେଲା: $1, 2, 3, 4, 6, 12$।

#### ୨. ଗୁଣିତକ (Multiples):
ଏକ ସଂଖ୍ୟା ସହିତ $1, 2, 3...$ ଗୁଣନ କରି ଯେଉଁ ଗୁଣଫଳ ମିଳେ, ସେଗୁଡ଼ିକୁ ସେହି ସଂଖ୍ୟାର ଗୁଣିତକ କୁହାଯାଏ।
* $5$ ର ଗୁଣିତକଗୁଡ଼ିକ ହେଲା: $5, 10, 15, 20, 25...$

#### ⭐ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର:
* ପ୍ରତ୍ୟେକ ସଂଖ୍ୟାର ସର୍ବନିମ୍ନ ଗୁଣନୀୟକ ହେଉଛି $1$ ଏବଂ ସର୍ବାଧିକ ଗୁଣନୀୟକ ହେଉଛି ସେହି ସଂଖ୍ୟା ନିଜେ।`
  },

  // Class 5 Math
  {
    class: 'class5',
    id: 'class5_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ସାଧାରଣ ଗୁଣନୀୟକ ଓ ଗୁଣିତକ (L.C.M. & H.C.F.)',
    status: 'published',
    notes: `### 🔍 ଗରିଷ୍ଠ ସାଧାରଣ ଗୁଣନୀୟକ (ଗ.ସା.ଗୁ.) ଏବଂ ଲଘିଷ୍ଠ ସାଧାରଣ ଗୁଣିତକ (ଲ.ସା.ଗୁ.)

#### ୧. ଗ.ସା.ଗୁ. (H.C.F. - Highest Common Factor):
ଦୁଇ ବା ତତୋଧିକ ସଂଖ୍ୟାର ସାଧାରଣ ଗୁଣନୀୟକମାନଙ୍କ ମଧ୍ୟରେ ଯେଉଁଟି ସବୁଠାରୁ ବଡ଼, ତାହାକୁ ଗ.ସା.ଗୁ. କୁହାଯାଏ।
* **ଉଦାହରଣ:** $8$ ଏବଂ $12$ ର ଗ.ସା.ଗୁ. କେତେ?
  * $8$ ର ଗୁଣନୀୟକ: $1, 2, 4, 8$
  * $12$ ର ଗୁଣନୀୟକ: $1, 2, 3, 4, 6, 12$
  * ସାଧାରଣ ଗୁଣନୀୟକ: $1, 2, 4$
  * ସବୁଠାରୁ ବଡ଼ ସାଧାରଣ ଗୁଣନୀୟକ ହେଉଛି $4$। ଅତଏବ, ଗ.ସା.ଗୁ. = $4$।

#### ୨. ଲ.ସା.ଗୁ. (L.C.M. - Least Common Multiple):
ଦୁଇ ବା ତତୋଧିକ ସଂଖ୍ୟାର ସାଧାରଣ ଗୁଣିତକମାନଙ୍କ ମଧ୍ୟରେ ଯେଉଁଟି ସବୁଠାରୁ ଛୋଟ, ତାହାକୁ ଲ.ସା.ଗୁ. କୁହାଯାଏ।
* **ଉଦାହରଣ:** $4$ ଏବଂ $6$ ର ଲ.ସା.ଗୁ. କେତେ?
  * $4$ ର ଗୁଣିତକ: $4, 8, 12, 16, 20, 24...$
  * $6$ ର ଗୁଣିତକ: $6, 12, 18, 24, 30...$
  * ସର୍ବନିମ୍ନ ସାଧାରଣ ଗୁଣିତକ ହେଉଛି $12$। ଅତଏବ, ଲ.ସା.ଗୁ. = $12$।`
  },

  // Class 6 Math
  {
    class: 'class6',
    id: 'class6_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା (Integers)',
    status: 'published',
    notes: `### 🔢 ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା (Integers)

ପିଲାମାନେ, ଆମେ ଜାଣିଛୁ ଯେ ଗଣନ ସଂଖ୍ୟାଗୁଡ଼ିକ $1, 2, 3...$ ଅଟନ୍ତି। କିନ୍ତୁ ଶୂନ ($0$) ଏବଂ ଋଣାତ୍ମକ ସଂଖ୍ୟାଗୁଡ଼ିକୁ ମିଶାଇଲେ ଆମେ **ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା** ପାଇଥାଉ।

#### ୧. ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା ସେଟ୍ (Set of Integers):
ଏହି ସେଟ୍ କୁ $Z$ ସଙ୍କେତ ଦ୍ୱାରା ପ୍ରକାଶ କରାଯାଏ।
$$Z = \\{..., -3, -2, -1, 0, 1, 2, 3, ...\\}$$

#### ୨. ସଂଖ୍ୟା ରେଖା (Number Line):
ସଂଖ୍ୟା ରେଖାର ମଝିରେ $0$ ଥାଏ। 
* ଡାହାଣ ପଟେ ଧନାତ୍ମକ ସଂଖ୍ୟା ($1, 2, 3...$) ଥାଏ।
* ବାମ ପଟେ ଋଣାତ୍ମକ ସଂଖ୍ୟା ($-1, -2, -3...$) ଥାଏ।

#### ୩. ଯୋଗ ସୂତ୍ର:
* $(+5) + (-3) = +2$
* $(-4) + (-2) = -6$`
  },

  // Class 7 Math
  {
    class: 'class7',
    id: 'class7_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ପରିମେୟ ସଂଖ୍ୟା (Rational Numbers)',
    status: 'published',
    notes: `### ⚖️ ପରିମେୟ ସଂଖ୍ୟା (Rational Numbers)

#### ୧. ସଂଜ୍ଞା (Definition):
ଯେଉଁ ସଂଖ୍ୟାକୁ $\\frac{p}{q}$ ଆକାରରେ ପ୍ରକାଶ କରାଯାଇପାରେ, ଯେଉଁଠାରେ $p$ ଓ $q$ ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା ଏବଂ $q \\neq 0$ , ତାହାକୁ **ପରିମେୟ ସଂଖ୍ୟା** କୁହାଯାଏ।

* **ଉଦାହରଣ:** $\\frac{2}{3}$ , $-\\frac{5}{7}$ , $4$ (କାରଣ $4 = \\frac{4}{1}$)।

#### ୨. ଗୁଣଧର୍ମ:
* ପ୍ରତ୍ୟେକ ଭଗ୍ନ ସଂଖ୍ୟା ଏକ ପରିମେୟ ସଂଖ୍ୟା ଅଟେ।
* ପରିମେୟ ସଂଖ୍ୟାର ହର ($q$) କଦାପି $0$ ହେବନାହିଁ।`
  },

  // Class 8 Math
  {
    class: 'class8',
    id: 'class8_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ଏକ ଅଜ୍ଞାତ ରାଶି ବିଶିଷ୍ଟ ଏକଘାତୀ ସମୀକରଣ (Linear Equations)',
    status: 'published',
    notes: `### 📉 ଏକ ଅଜ୍ଞାତ ରାଶି ବିଶିଷ୍ଟ ଏକଘାତୀ ସମୀକରଣ (Linear Equations in One Variable)

#### ୧. ସମୀକରଣର ସ୍ୱରୂପ:
ଏହି ସମୀକରଣରେ କେବଳ ଗୋଟିଏ ଅଜ୍ଞାତ ଚଳରାଶି (Variables) ଥାଏ ଏବଂ ଏହାର ସର୍ବାଧିକ ଘାତ $1$ ହୋଇଥାଏ।
* ସାଧାରଣ ସୂତ୍ର: $ax + b = 0$ (ଯେଉଁଠାରେ $a \\neq 0$)

#### ୨. ସମାଧାନ ପ୍ରଣାଳୀ:
ଚଳରାଶିର ମାନ ବାହାର କରିବା ପାଇଁ ଆମେ ପକ୍ଷାନ୍ତର ପ୍ରଣାଳୀ ବ୍ୟବହାର କରିଥାଉ।
* **ଉଦାହରଣ:** $3x - 9 = 0$ ର ସମାଧାନ କର।
  * ପର୍ଯ୍ୟାୟ ୧: $3x = 9$ (ବାମ ପାର୍ଶ୍ୱରୁ $-9$ ଡାହାଣକୁ ଯାଇ $+9$ ହେଲା)
  * ପର୍ଯ୍ୟାୟ ୨: $x = \\frac{9}{3}$
  * ପର୍ଯ୍ୟାୟ ୩: $x = 3$।`
  },

  // Class 9 Math
  {
    class: 'class9',
    id: 'class9_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ସେଟ୍ ପ୍ରକ୍ରିୟା ଓ ସେଟ୍ ଆଲୋଚନା (Set Operations)',
    status: 'published',
    notes: `### 📊 ସେଟ୍ ପ୍ରକ୍ରିୟା (Set Operations)

ଜର୍ମାନ ଗଣିତଜ୍ଞ **ଜର୍ଜ କ୍ୟାଣ୍ଟର** ସେଟ୍ ତତ୍ତ୍ୱର ଜନକ ଅଟନ୍ତି। 

#### ୧. ସେଟ୍ ସଂଯୋଗ (Union of Sets):
ଦୁଇଟି ସେଟ୍ $A$ ଏବଂ $B$ ର ସମସ୍ତ ଉପାଦାନକୁ ନେଇ ଗଠିତ ସେଟ୍ କୁ ସଂଯୋଗ ସେଟ୍ କୁହାଯାଏ। ଏହାକୁ $A \\cup B$ ଦ୍ୱାରା ସୂଚିତ କରାଯାଏ।
* ଯଦି $A = \\{1, 2, 3\\}$ ଏବଂ $B = \\{3, 4, 5\\}$ 
* ତେବେ $A \\cup B = \\{1, 2, 3, 4, 5\\}$

#### ୨. ସେଟ୍ ଛେଦ (Intersection of Sets):
ଦୁଇଟି ସେଟ୍ $A$ ଏବଂ $B$ ମଧ୍ୟରେ ଥିବା ସାଧାରଣ (Common) ଉପାଦାନଗୁଡ଼ିକୁ ନେଇ ଗଠିତ ସେଟ୍ କୁ ଛେଦ ସେଟ୍ କୁହାଯାଏ। ଏହାକୁ $A \\cap B$ ଦ୍ୱାରା ସୂଚିତ କରାଯାଏ।
* $A \\cap B = \\{3\\}$`
  },
  {
    class: 'class9',
    id: 'class9_math_ch2',
    subject: 'math',
    board: 'bse',
    title: 'ବାସ୍ତବ ସଂଖ୍ୟା (Real Numbers)',
    status: 'published',
    notes: `### 🔢 ବାସ୍ତବ ସଂଖ୍ୟା (Real Numbers)

ବାସ୍ତବ ସଂଖ୍ୟା ସେଟ୍ କୁ $R$ ଦ୍ୱାରା ପ୍ରକାଶ କରାଯାଏ। ଏହା ପରିମେୟ ଏବଂ ଅପରିମେୟ ସଂଖ୍ୟାର ସମାହାର ଅଟେ।

#### ୧. ବର୍ଗମୂଳ ଗୁଣଧର୍ମ (Square Roots):
* $\\sqrt{a \\times b} = \\sqrt{a} \\times \\sqrt{b}$
* $\\sqrt{\\frac{a}{b}} = \\frac{\\sqrt{a}}{\\sqrt{b}}$

#### ୨. ଘାତାଙ୍କର ନିୟମ (Laws of Exponents):
* $a^m \\times a^n = a^{m+n}$
* $\\frac{a^m}{a^n} = a^{m-n}$
* $(a^m)^n = a^{m \\times n}$`
  },

  // Class 10 Math
  {
    class: 'class10',
    id: 'class10_math_ch1',
    subject: 'math',
    board: 'bse',
    title: 'ସରଳ ସହସମୀକରଣ (Linear Simultaneous Equations)',
    status: 'published',
    notes: `### 📉 ସରଳ ସହସମୀକରଣ (Linear Simultaneous Equations)

#### ୧. ଦୁଇ ଚଳରାଶି ବିଶିଷ୍ଟ ଏକଘାତୀ ସହସମୀକରଣର ସାଧାରଣ ରୂପ:
$$a_1x + b_1y + c_1 = 0$$
$$a_2x + b_2y + c_2 = 0$$

ଯେଉଁଠାରେ $a_1, b_1, c_1, a_2, b_2, c_2$ ବାସ୍ତବ ସଂଖ୍ୟା ଏବଂ $a_1^2 + b_1^2 \\neq 0$, $a_2^2 + b_2^2 \\neq 0$।

#### ୨. ଜ୍ୟାମିତିକ ଚିତ୍ର ଏବଂ ସମାଧାନର ସର୍ତ୍ତାବଳୀ:
* **ଅନନ୍ୟ ସମାଧାନ (Unique Solution):** ଯଦି ଦୁଇଟି ରେଖା ପରସ୍ପରକୁ ଗୋଟିଏ ବିନ୍ଦୁରେ ଛେଦ କରନ୍ତି।
  * ସର୍ତ୍ତ: $\\frac{a_1}{a_2} \\neq \\frac{b_1}{b_2}$
* **ଅସଂଖ୍ୟ ସମାଧାନ (Infinite Solutions):** ଯଦି ଦୁଇଟି ରେଖା ଏକ ଓ ଅଭିନ୍ନ (ସମପାତୀ) ହୁଅନ୍ତି।
  * ସର୍ତ୍ତ: $\\frac{a_1}{a_2} = \\frac{b_1}{b_2} = \\frac{c_1}{c_2}$
* **ଅସମ୍ଭବ ସମାଧାନ (No Solution):** ଯଦି ଦୁଇଟି ରେଖା ସମାନ୍ତର ହୁଅନ୍ତି।
  * ସର୍ତ୍ତ: $\\frac{a_1}{a_2} = \\frac{b_1}{b_2} \\neq \\frac{c_1}{c_2}$`
  },
  {
    class: 'class10',
    id: 'class10_math_ch2',
    subject: 'math',
    board: 'bse',
    title: 'ଦ୍ୱିଘାତ ସମୀକରଣ (Quadratic Equations)',
    status: 'published',
    notes: `### 📐 ଦ୍ୱିଘାତ ସମୀକରଣ (Quadratic Equations)

#### ୧. ସାଧାରଣ ରୂପ:
$$ax^2 + bx + c = 0$$
ଯେଉଁଠାରେ $a, b, c$ ବାସ୍ତବ ସଂଖ୍ୟା ଏବଂ $a \\neq 0$।

#### ୨. ପ୍ରଭେଦକ ବା ନିରୂପକ (Discriminant):
ଦ୍ୱିଘାତ ସମୀକରଣର ପ୍ରଭେଦକକୁ $D$ ବା $d$ ସଙ୍କେତ ଦ୍ୱାରା ପ୍ରକାଶ କରାଯାଏ।
$$D = b^2 - 4ac$$

#### ୩. ସୂତ୍ର ସାହାଯ୍ୟରେ ମୂଳଦ୍ୱୟର ନିର୍ଣ୍ଣୟ:
ଶ୍ରୀଧର ଆଚାର୍ଯ୍ୟଙ୍କ ସୂତ୍ର ଅନୁଯାୟୀ ସମୀକରଣର ଦୁଇଟି ମୂଳ (Roots) ହେଲା:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

#### ୪. ମୂଳଦ୍ୱୟର ସ୍ୱରୂପ:
* ଯଦି $D > 0$ , ମୂଳଦ୍ୱୟ ବାସ୍ତବ ଏବଂ ଅସମାନ ହେବେ।
* ଯଦି $D = 0$ , ମୂଳଦ୍ୱୟ ବାସ୍ତବ ଏବଂ ସମାନ ହେବେ ($x = -\\frac{b}{2a}$)।
* ଯଦି $D < 0$ , କୌଣସି ବାସ୍ତବ ମୂଳ ରହିବ ନାହିଁ।`
  },
  {
    class: 'class10',
    id: 'class10_math_ch3',
    subject: 'math',
    board: 'bse',
    title: 'ସମାନ୍ତର ପ୍ରଗତି (Arithmetic Progression)',
    status: 'published',
    notes: `### 📈 ସମାନ୍ତର ପ୍ରଗତି (Arithmetic Progression)

ସମାନ୍ତର ପ୍ରଗତି (A.P.) ହେଉଛି ସଂଖ୍ୟାଗୁଡ଼ିକର ଏକ କ୍ରମ ଯେଉଁଠାରେ କ୍ରମାଗତ ଦୁଇଟି ପଦର ପାର୍ଥକ୍ୟ ସର୍ବଦା ସମାନ ରହେ। ଏହି ସାଧାରଣ ପାର୍ଥକ୍ୟକୁ ସାଧାରଣ ଅନ୍ତର ($d$) କୁହାଯାଏ।

#### ୧. ସାଧାରଣ ରୂପ:
$$a, a+d, a+2d, a+3d, ...$$
ଯେଉଁଠାରେ $a$ ପ୍ରଥମ ପଦ ଏବଂ $d$ ସାଧାରଣ ଅନ୍ତର।

#### ୨. $n$-ତମ ପଦ ($t_n$):
$$t_n = a + (n - 1)d$$

#### ୩. ପ୍ରଥମ $n$ ସଂଖ୍ୟକ ପଦର ସମଷ୍ଟି ($S_n$):
$$S_n = \\frac{n}{2} [2a + (n - 1)d]$$
অথବା
$$S_n = \\frac{n}{2} [a + t_n]$$ (ଯଦି ଶେଷ ପଦ ଜଣାଥାଏ)`
  },
  {
    class: 'class10',
    id: 'class10_math_ch4',
    subject: 'math',
    board: 'bse',
    title: 'ସମ୍ଭାବ୍ୟତା (Probability)',
    status: 'published',
    notes: `### 🎲 ସମ୍ଭାବ୍ୟତା (Probability)

#### ୧. ସଂଜ୍ଞା:
କୌଣସି ଏକ ଘଟଣା ($E$) ଘଟିବାର ସମ୍ଭାବ୍ୟତାକୁ $P(E)$ ଦ୍ୱାରା ପ୍ରକାଶ କରାଯାଏ।
$$P(E) = \\frac{\\text{ଅନୁକୂଳ ଫଳାଫଳ ସଂଖ୍ୟା} ( |E| )}{\\text{ସମୁଦାୟ ସମ୍ଭାବ୍ୟ ଫଳାଫଳ ସଂଖ୍ୟା} ( |S| )}$$

#### ୨. ମୁଖ୍ୟ ନିୟମଗୁଡ଼ିକ:
* ସମ୍ଭାବ୍ୟତାର ମାନ ସର୍ବଦା $0$ ରୁ $1$ ମଧ୍ୟରେ ରହିଥାଏ:
  $$0 \\le P(E) \\le 1$$
* ଏକ ଅସମ୍ଭବ ଘଟଣାର ସମ୍ଭାବ୍ୟତା $0$ ଅଟେ।
* ଏକ ସୁନିଶ୍ଚିତ ଘଟଣାର ସମ୍ଭାବ୍ୟତା $1$ ଅଟେ।`
  },
  {
    class: 'class10',
    id: 'class10_math_ch5',
    subject: 'math',
    board: 'bse',
    title: 'ତ୍ରିକୋଣମିତି (Trigonometry)',
    status: 'published',
    notes: `### 📐 ତ୍ରିକୋଣମିତି (Trigonometry)

#### ୧. ମୌଳିକ ସୂତ୍ରାବଳୀ:
ସମକୋଣୀ ତ୍ରିଭୁଜରେ କୋଣ $\\theta$ ପାଇଁ:
* $\\sin \\theta = \\frac{\\text{ଲମ୍ବ} (p)}{\\text{କର୍ଣ୍ଣ} (h)}$
* $\\cos \\theta = \\frac{\\text{ଭୂମି} (b)}{\\text{କର୍ଣ୍ଣ} (h)}$
* $\\tan \\theta = \\frac{\\text{ଲମ୍ବ} (p)}{\\text{ଭୂମି} (b)}$

#### ୨. ତ୍ରିକୋଣମିତିକ ଅଭେଦାବଳୀ (Identities):
* $\\sin^2 \\theta + \\cos^2 \\theta = 1$
* $1 + \\tan^2 \\theta = \\sec^2 \\theta$
* $1 + \\cot^2 \\theta = \\csc^2 \\theta$`
  }
];

async function seed() {
  console.log('--- Initializing Math Curriculum Seed Script ---');

  const serviceAccount = getServiceAccountCredentials();
  if (!serviceAccount) {
    console.error('No service account found in environment or fallback locations.');
    process.exit(1);
  }

  const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount as any),
        projectId: serviceAccount.project_id
      })
    : getApp();

  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';
  const db = getFirestore(app, databaseId);

  console.log(`Seeding chapters into Database ID: ${databaseId}...`);

  for (const chapter of seedChaptersData) {
    const docId = chapter.id;
    const docRef = db.collection('chapters').doc(docId);
    
    const payload = {
      ...chapter,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await docRef.set(payload, { merge: true });
      console.log(`✅ Chapter seeded: "${chapter.title}" (Class: ${chapter.class}, ID: ${docId})`);
    } catch (error) {
      console.error(`❌ Failed to seed chapter ${docId}:`, error);
    }
  }

  console.log('--- Seeding Completed Successfully ---');
  process.exit(0);
}

seed();
