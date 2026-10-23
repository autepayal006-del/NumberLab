/**
 * NumberLab — Number System Explorer
 * Modern educational engine for Binary, Octal, Decimal, and Hexadecimal systems.
 */

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. STATE & CONSTANTS
  // -------------------------------------------------------------------------
  const STATE = {
    activeTab: 'converter',
    theme: localStorage.getItem('numberlab_theme') || 'dark',
    formatNibbles: true,
    lastFocusedInput: null,
    bitWidth: 8, // 8 or 16
    bitArray: new Array(8).fill(0),
    isSyncing: false,
    history: [],
    quiz: {
      score: 0,
      streak: 0,
      bestStreak: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      currentQuestion: null,
      answered: false
    }
  };

  // Base configurations
  const BASES = {
    2: { name: 'Binary', prefix: '', radix: 2, allowed: /^[01]+$/, tag: 'BIN' },
    8: { name: 'Octal', prefix: '0o', radix: 8, allowed: /^[0-7]+$/, tag: 'OCT' },
    10: { name: 'Decimal', prefix: '', radix: 10, allowed: /^[0-9]+$/, tag: 'DEC' },
    16: { name: 'Hexadecimal', prefix: '0x', radix: 16, allowed: /^[0-9a-fA-F]+$/, tag: 'HEX' }
  };

  // -------------------------------------------------------------------------
  // 2. DOM ELEMENT REFERENCES
  // -------------------------------------------------------------------------
  const DOM = {
    html: document.documentElement,
    themeToggle: document.getElementById('theme-toggle'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    // Converter Inputs
    inputDec: document.getElementById('input-dec'),
    inputBin: document.getElementById('input-bin'),
    inputHex: document.getElementById('input-hex'),
    inputOct: document.getElementById('input-oct'),

    // Validation containers
    valDec: document.getElementById('val-dec'),
    valBin: document.getElementById('val-bin'),
    valHex: document.getElementById('val-hex'),
    valOct: document.getElementById('val-oct'),

    // Counts
    countDec: document.getElementById('count-dec'),
    countBin: document.getElementById('count-bin'),
    countHex: document.getElementById('count-hex'),
    countOct: document.getElementById('count-oct'),

    // Buttons & Presets
    btnClearAll: document.getElementById('btn-clear-all'),
    btnRandomNumber: document.getElementById('btn-random-number'),
    btnToggleNibbles: document.getElementById('btn-toggle-nibbles'),
    presetBtns: document.querySelectorAll('.preset-btn[data-preset]'),
    copyBtns: document.querySelectorAll('.copy-btn'),
    explainBtns: document.querySelectorAll('.explain-btn'),

    // Keypad
    keypadBtns: document.querySelectorAll('.key-btn[data-key]'),
    keyBackspace: document.getElementById('key-backspace'),
    keyClearFocused: document.getElementById('key-clear-focused'),

    // Explanation Section
    expContainer: document.getElementById('explanation-container'),
    expHeadline: document.getElementById('exp-headline'),
    expFromSelect: document.getElementById('exp-from-select'),
    expToSelect: document.getElementById('exp-to-select'),
    btnCopySteps: document.getElementById('btn-copy-steps'),

    // Bitboard
    bitCellsContainer: document.getElementById('bit-cells-container'),
    nibbleGroupsContainer: document.getElementById('nibble-groups-container'),
    bitWidthBtns: document.querySelectorAll('.toggle-mode-btn[data-bits]'),
    btnInvertBits: document.getElementById('btn-invert-bits'),
    btnSetAllBits: document.getElementById('btn-set-all-bits'),
    btnClearBits: document.getElementById('btn-clear-bits'),
    bitMetricUnsigned: document.getElementById('bit-metric-unsigned'),
    bitMetricSigned: document.getElementById('bit-metric-signed'),
    bitMetricHex: document.getElementById('bit-metric-hex'),
    bitMetricOct: document.getElementById('bit-metric-oct'),
    bitMetricAscii: document.getElementById('bit-metric-ascii'),
    bitMetricAsciiDesc: document.getElementById('bit-metric-ascii-desc'),
    bitMetricParity: document.getElementById('bit-metric-parity'),
    bitMetricOnes: document.getElementById('bit-metric-ones'),

    // Academy
    cheatTableBody: document.getElementById('cheat-table-body'),

    // Quiz
    quizScore: document.getElementById('quiz-score'),
    quizStreak: document.getElementById('quiz-streak'),
    quizBestStreak: document.getElementById('quiz-best-streak'),
    quizAccuracy: document.getElementById('quiz-accuracy'),
    quizDifficulty: document.getElementById('quiz-difficulty'),
    quizMode: document.getElementById('quiz-mode'),
    btnNewQuestion: document.getElementById('btn-new-question'),
    btnResetQuizStats: document.getElementById('btn-reset-quiz-stats'),
    quizQIndex: document.getElementById('quiz-q-index'),
    quizQDiff: document.getElementById('quiz-q-diff'),
    quizTargetBaseName: document.getElementById('quiz-target-base-name'),
    quizSourceValue: document.getElementById('quiz-source-value'),
    quizSourceBaseBadge: document.getElementById('quiz-source-base-badge'),
    quizOptionsContainer: document.getElementById('quiz-options-container'),
    quizFeedbackBanner: document.getElementById('quiz-feedback-banner'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackDesc: document.getElementById('feedback-desc'),
    btnQuizShowSteps: document.getElementById('btn-quiz-show-steps'),

    // History
    historyList: document.getElementById('history-items-list'),
    historyEmptyState: document.getElementById('history-empty-state'),
    historyBadge: document.getElementById('history-badge'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    btnExportHistory: document.getElementById('btn-export-history'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // -------------------------------------------------------------------------
  // 3. MATHEMATICAL & CONVERSION HELPERS (USING BIGINT)
  // -------------------------------------------------------------------------
  /**
   * Sanitizes input string by removing spaces and standard prefixes.
   */
  function cleanString(str, radix) {
    if (!str) return '';
    let cleaned = str.trim().replace(/\s+/g, '');
    if (radix === 16) {
      if (cleaned.toLowerCase().startsWith('0x')) cleaned = cleaned.slice(2);
      return cleaned.toUpperCase();
    }
    if (radix === 8) {
      if (cleaned.toLowerCase().startsWith('0o')) cleaned = cleaned.slice(2);
      return cleaned;
    }
    if (radix === 2) {
      if (cleaned.toLowerCase().startsWith('0b')) cleaned = cleaned.slice(2);
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Validates if string contains only characters valid for given radix.
   * Returns { valid: boolean, invalidChars: string[] }
   */
  function validateInput(rawStr, radix) {
    const cleaned = cleanString(rawStr, radix);
    if (!cleaned) return { valid: true, cleaned: '', invalidChars: [] };

    let allowedSet;
    switch (radix) {
      case 2:  allowedSet = /^[01]+$/; break;
      case 8:  allowedSet = /^[0-7]+$/; break;
      case 10: allowedSet = /^[0-9]+$/; break;
      case 16: allowedSet = /^[0-9A-Fa-f]+$/; break;
      default: return { valid: false, cleaned, invalidChars: ['unknown base'] };
    }

    if (allowedSet.test(cleaned)) {
      return { valid: true, cleaned, invalidChars: [] };
    }

    // Find all illegal characters
    const invalids = new Set();
    for (const char of cleaned) {
      if (!allowedSet.test(char)) invalids.add(char);
    }
    return { valid: false, cleaned, invalidChars: Array.from(invalids) };
  }

  /**
   * Converts a valid string from given radix into BigInt.
   */
  function parseToBigInt(str, radix) {
    const cleaned = cleanString(str, radix);
    if (!cleaned) return null;

    try {
      if (radix === 10) return BigInt(cleaned);
      if (radix === 16) return BigInt('0x' + cleaned);
      if (radix === 8)  return BigInt('0o' + cleaned);
      if (radix === 2)  return BigInt('0b' + cleaned);
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Converts BigInt to target base string.
   */
  function bigIntToBaseString(bigVal, targetRadix, formatNibbles = false) {
    if (bigVal === null || bigVal === undefined) return '';
    if (bigVal < 0n) return ''; // Only non-negative for standard base explorer

    let res = bigVal.toString(targetRadix);
    if (targetRadix === 16) res = res.toUpperCase();

    if (targetRadix === 2 && formatNibbles && res.length > 4) {
      // Group binary into 4-bit nibbles from right to left
      let parts = [];
      let rem = res.length % 4;
      if (rem > 0) parts.push(res.slice(0, rem));
      for (let i = rem; i < res.length; i += 4) {
        parts.push(res.slice(i, i + 4));
      }
      return parts.join(' ');
    }
    return res;
  }

  // -------------------------------------------------------------------------
  // 4. LIVE CONVERTER & SYNCHRONIZATION
  // -------------------------------------------------------------------------
  /**
   * Synchronizes all 4 base cards when user inputs into one card.
   */
  function handleInputSync(sourceRadix, sourceValue) {
    if (STATE.isSyncing) return;
    STATE.isSyncing = true;

    clearAllValidationMessages();
    const validation = validateInput(sourceValue, sourceRadix);

    if (!sourceValue.trim()) {
      clearAllFields(false);
      renderExplanationPlaceholder();
      STATE.isSyncing = false;
      return;
    }

    if (!validation.valid) {
      showValidationError(sourceRadix, validation.invalidChars);
      STATE.isSyncing = false;
      return;
    }

    const bigVal = parseToBigInt(validation.cleaned, sourceRadix);
    if (bigVal === null) {
      showValidationError(sourceRadix, ['invalid number']);
      STATE.isSyncing = false;
      return;
    }

    // Update all other inputs
    if (sourceRadix !== 10) DOM.inputDec.value = bigIntToBaseString(bigVal, 10);
    if (sourceRadix !== 2)  DOM.inputBin.value = bigIntToBaseString(bigVal, 2, STATE.formatNibbles);
    if (sourceRadix !== 16) DOM.inputHex.value = bigIntToBaseString(bigVal, 16);
    if (sourceRadix !== 8)  DOM.inputOct.value = bigIntToBaseString(bigVal, 8);

    updateCharCounts(bigVal);
    syncBitboardFromBigInt(bigVal);

    // Update explanation view
    updateExplanation(sourceRadix, parseInt(DOM.expToSelect.value, 10), validation.cleaned);

    // Record conversion history (debounced)
    recordHistoryDebounced(sourceRadix, validation.cleaned, bigVal);

    STATE.isSyncing = false;
  }

  function clearAllFields(clearAllInputs = true) {
    if (clearAllInputs) {
      DOM.inputDec.value = '';
      DOM.inputBin.value = '';
      DOM.inputHex.value = '';
      DOM.inputOct.value = '';
    }
    clearAllValidationMessages();
    DOM.countDec.textContent = '0 digits';
    DOM.countBin.textContent = '0 bits';
    DOM.countHex.textContent = '0 digits';
    DOM.countOct.textContent = '0 digits';
    syncBitboardFromBigInt(0n);
  }

  function clearAllValidationMessages() {
    [DOM.valDec, DOM.valBin, DOM.valHex, DOM.valOct].forEach(el => {
      el.textContent = '';
    });
    [DOM.inputDec, DOM.inputBin, DOM.inputHex, DOM.inputOct].forEach(el => {
      el.classList.remove('input-error');
    });
  }

  function showValidationError(radix, invalidChars) {
    const errorMap = {
      2: { val: DOM.valBin, input: DOM.inputBin, name: 'Binary only allows 0 and 1' },
      8: { val: DOM.valOct, input: DOM.inputOct, name: 'Octal only allows 0 to 7 (no 8 or 9)' },
      10: { val: DOM.valDec, input: DOM.inputDec, name: 'Decimal only allows 0 to 9' },
      16: { val: DOM.valHex, input: DOM.inputHex, name: 'Hexadecimal only allows 0-9 and A-F' }
    };
    const target = errorMap[radix];
    if (target) {
      target.input.classList.add('input-error');
      const charList = invalidChars.map(c => `"${c}"`).join(', ');
      target.val.innerHTML = `⚠️ Invalid character ${charList}. ${target.name}.`;
    }
  }

  function updateCharCounts(bigVal) {
    if (bigVal === null) return;
    const decStr = bigVal.toString(10);
    const binStr = bigVal.toString(2);
    const hexStr = bigVal.toString(16);
    const octStr = bigVal.toString(8);

    DOM.countDec.textContent = `${decStr.length} digit${decStr.length === 1 ? '' : 's'}`;
    DOM.countBin.textContent = `${binStr.length} bit${binStr.length === 1 ? '' : 's'}`;
    DOM.countHex.textContent = `${hexStr.length} hex digit${hexStr.length === 1 ? '' : 's'}`;
    DOM.countOct.textContent = `${octStr.length} oct digit${octStr.length === 1 ? '' : 's'}`;
  }

  // -------------------------------------------------------------------------
  // 5. STEP-BY-STEP EXPLANATION GENERATOR
  // -------------------------------------------------------------------------
  /**
   * Generates step-by-step mathematical breakdown between source and target base.
   */
  function updateExplanation(fromRadix, toRadix, sourceStr) {
    if (!sourceStr) {
      renderExplanationPlaceholder();
      return;
    }

    const clean = cleanString(sourceStr, fromRadix);
    const bigVal = parseToBigInt(clean, fromRadix);

    if (bigVal === null) {
      renderExplanationPlaceholder();
      return;
    }

    const fromName = BASES[fromRadix].name;
    const toName = BASES[toRadix].name;
    DOM.expHeadline.textContent = `Converting ${clean} (${fromName}) → ${toName}`;

    // Handle Identity (same base)
    if (fromRadix === toRadix) {
      DOM.expContainer.innerHTML = `
        <div class="exp-summary-banner">
          <div>Same Base Conversion: <strong>${clean} (${fromName})</strong> is already in <strong>${toName}</strong>.</div>
          <div class="math-res">${clean}</div>
        </div>
      `;
      return;
    }

    let html = '';

    // Direct Grouping: Binary <-> Hex (4-bit nibbles)
    if (fromRadix === 2 && toRadix === 16) {
      html = generateBinaryToHexExplanation(clean, bigVal);
    } else if (fromRadix === 16 && toRadix === 2) {
      html = generateHexToBinaryExplanation(clean, bigVal);
    }
    // Direct Grouping: Binary <-> Octal (3-bit groups)
    else if (fromRadix === 2 && toRadix === 8) {
      html = generateBinaryToOctalExplanation(clean, bigVal);
    } else if (fromRadix === 8 && toRadix === 2) {
      html = generateOctalToBinaryExplanation(clean, bigVal);
    }
    // Direct Grouping Bridge: Octal <-> Hex (via 3-bit / 4-bit Binary Bridge)
    else if ((fromRadix === 8 && toRadix === 16) || (fromRadix === 16 && toRadix === 8)) {
      html = generateOctalHexBridgeExplanation(fromRadix, toRadix, clean, bigVal);
    }
    // Decimal to Base N (Repeated Division Method)
    else if (fromRadix === 10) {
      html = generateRepeatedDivisionExplanation(bigVal, toRadix);
    }
    // Base N to Decimal (Positional Weight Expansion Method)
    else if (toRadix === 10) {
      html = generatePositionalExpansionExplanation(clean, fromRadix, bigVal);
    }
    // Any other combination: bridge through Decimal or Binary
    else {
      html = generateBridgeExplanation(fromRadix, toRadix, clean, bigVal);
    }

    DOM.expContainer.innerHTML = html;
  }

  function renderExplanationPlaceholder() {
    DOM.expHeadline.textContent = 'Conversion Breakdown';
    DOM.expContainer.innerHTML = `
      <div class="history-empty-state" style="padding: 2.5rem 1rem;">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <h3>No number entered yet</h3>
        <p>Type any number into the converter cards above or pick a quick preset to see the step-by-step solution here.</p>
      </div>
    `;
  }

  /**
   * Method 1: Repeated Division-by-Base (Decimal -> Base N)
   */
  function generateRepeatedDivisionExplanation(bigVal, targetRadix) {
    const targetName = BASES[targetRadix].name;
    const finalResult = bigIntToBaseString(bigVal, targetRadix);
    const radixBig = BigInt(targetRadix);

    if (bigVal === 0n) {
      return `
        <div class="exp-flow-block">
          <div class="exp-summary-banner">
            <div>0 in Decimal is simply <strong>0</strong> in ${targetName}.</div>
            <div class="math-res">0</div>
          </div>
        </div>
      `;
    }

    let temp = bigVal;
    let steps = [];
    let stepNum = 1;

    while (temp > 0n) {
      let quotient = temp / radixBig;
      let remainder = Number(temp % radixBig);
      let remSymbol = remainder >= 10 ? String.fromCharCode(55 + remainder) : remainder.toString();
      steps.push({
        step: stepNum++,
        dividend: temp.toString(),
        quotient: quotient.toString(),
        remainder: remainder,
        remSymbol: remSymbol
      });
      temp = quotient;
    }

    let tableRows = steps.map(s => {
      let hexNote = targetRadix === 16 && s.remainder >= 10 ? ` = <strong>${s.remSymbol}</strong>` : '';
      return `
        <tr>
          <td>#${s.step}</td>
          <td>${s.dividend}</td>
          <td>÷ ${targetRadix}</td>
          <td>${s.quotient}</td>
          <td class="col-rem">${s.remainder}${hexNote}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Repeated Division by ${targetRadix}</strong></div>
          <div>Result: <span class="math-res">${finalResult}</span> <small>(${targetName})</small></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">
            <span>Algorithm: Divide by ${targetRadix} and record remainders until quotient becomes 0</span>
          </div>
          <table class="math-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Dividend</th>
                <th>Operation</th>
                <th>Quotient</th>
                <th>Remainder (Digit)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="arrow-up-label">
            <span>↑ Read remainders from bottom to top (Last remainder is Most Significant Digit)</span>
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Final Answer Assembly</div>
          <p>Assembling the remainders in reverse order yields: 
            <strong class="font-mono" style="font-size: 1.2rem; color: var(--color-accent);">${finalResult}</strong>
            <sub>${targetRadix}</sub>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Method 2: Positional Weight Expansion (Base N -> Decimal)
   */
  function generatePositionalExpansionExplanation(cleanStr, fromRadix, bigVal) {
    const fromName = BASES[fromRadix].name;
    const digits = cleanStr.toUpperCase().split('');
    const len = digits.length;
    let terms = [];
    let termEvaluations = [];
    let tableRows = [];
    let runningSum = 0n;

    for (let i = 0; i < len; i++) {
      const char = digits[i];
      const power = len - 1 - i;
      let digitVal = parseInt(char, fromRadix);
      let weight = BigInt(fromRadix) ** BigInt(power);
      let product = BigInt(digitVal) * weight;
      runningSum += product;

      terms.push(`(${char} × ${fromRadix}<sup>${power}</sup>)`);
      termEvaluations.push(product.toString());

      tableRows.push(`
        <tr>
          <td>Position ${power}</td>
          <td><strong>${char}</strong> ${char !== digitVal.toString() ? `(${digitVal})` : ''}</td>
          <td>${fromRadix}<sup>${power}</sup> = ${weight.toString()}</td>
          <td>${digitVal} × ${weight.toString()} = <strong>${product.toString()}</strong></td>
          <td>${runningSum.toString()}</td>
        </tr>
      `);
    }

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Positional Weight Polynomial Expansion</strong></div>
          <div>Result: <span class="math-res">${bigVal.toString(10)}</span> <small>(Decimal)</small></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Formula Expansion</div>
          <div class="expansion-equation">
            Value = ${terms.join(' + ')}<br>
            Value = ${termEvaluations.join(' + ')} = <span class="term-highlight">${bigVal.toString(10)}</span>
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Digit-by-Digit Positional Breakdown</div>
          <table class="math-table">
            <thead>
              <tr>
                <th>Position (Power)</th>
                <th>Digit</th>
                <th>Weight (Base<sup>pos</sup>)</th>
                <th>Contribution</th>
                <th>Running Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Method 3: Binary -> Hexadecimal (4-Bit Nibbles)
   */
  function generateBinaryToHexExplanation(binStr, bigVal) {
    // Pad to multiple of 4
    let rem = binStr.length % 4;
    let padded = rem === 0 ? binStr : '0'.repeat(4 - rem) + binStr;
    let nibbles = [];
    let hexDigits = [];

    for (let i = 0; i < padded.length; i += 4) {
      let nib = padded.slice(i, i + 4);
      let hexChar = parseInt(nib, 2).toString(16).toUpperCase();
      nibbles.push(nib);
      hexDigits.push(hexChar);
    }

    let nibbleBoxes = nibbles.map((nib, i) => `
      <div class="nibble-box">
        <span class="nibble-bits">${nib}</span>
        <span class="nibble-arrow">↓</span>
        <span class="nibble-hex">${hexDigits[i]}</span>
      </div>
    `).join('');

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>4-Bit Nibble Direct Grouping (2⁴ = 16)</strong></div>
          <div>Hexadecimal: <span class="math-res">0x${hexDigits.join('')}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step 1: Pad with Leading Zeros & Group into 4-Bit Nibbles</div>
          <p>Group bits into sets of 4 starting from the right. ${rem !== 0 ? `Added ${4 - rem} leading zero(s) for clean alignment.` : 'Already a multiple of 4.'}</p>
          <div class="nibble-visual-row">
            ${nibbleBoxes}
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step 2: Translate Each Nibble to Hex Symbol</div>
          <p>Concatenating the hex symbols yields: 
            <strong class="font-mono" style="font-size: 1.25rem; color: var(--color-hex);">0x${hexDigits.join('')}</strong>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Method 4: Hexadecimal -> Binary (Expand to 4-bit nibbles)
   */
  function generateHexToBinaryExplanation(hexStr, bigVal) {
    let clean = cleanString(hexStr, 16);
    let hexChars = clean.split('');
    let nibbles = [];

    for (const char of hexChars) {
      let decVal = parseInt(char, 16);
      let binNib = decVal.toString(2).padStart(4, '0');
      nibbles.push({ char, decVal, binNib });
    }

    let nibbleBoxes = nibbles.map(item => `
      <div class="nibble-box">
        <span class="nibble-hex">${item.char}</span>
        <span class="nibble-arrow">↓</span>
        <span class="nibble-bits">${item.binNib}</span>
      </div>
    `).join('');

    let fullBin = nibbles.map(n => n.binNib).join('');
    // Remove leading zeros for clean standard result
    let trimmedBin = bigVal.toString(2);

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Hexadecimal to 4-Bit Binary Expansion</strong></div>
          <div>Binary: <span class="math-res">${trimmedBin}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step: Expand Each Hex Digit into 4 Binary Bits</div>
          <div class="nibble-visual-row">
            ${nibbleBoxes}
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Final Binary Result</div>
          <p>Concatenating nibbles: <code class="font-mono">${fullBin}</code></p>
          <p>Standard format (unpadded): <strong class="font-mono" style="color: var(--color-bin); font-size: 1.2rem;">${trimmedBin}</strong><sub>2</sub></p>
        </div>
      </div>
    `;
  }

  /**
   * Method 5: Binary -> Octal (3-Bit Grouping)
   */
  function generateBinaryToOctalExplanation(binStr, bigVal) {
    let rem = binStr.length % 3;
    let padded = rem === 0 ? binStr : '0'.repeat(3 - rem) + binStr;
    let groups = [];
    let octDigits = [];

    for (let i = 0; i < padded.length; i += 3) {
      let grp = padded.slice(i, i + 3);
      let octChar = parseInt(grp, 2).toString(8);
      groups.push(grp);
      octDigits.push(octChar);
    }

    let groupBoxes = groups.map((grp, i) => `
      <div class="nibble-box">
        <span class="nibble-bits" style="color: var(--color-bin);">${grp}</span>
        <span class="nibble-arrow">↓</span>
        <span class="nibble-hex" style="color: var(--color-oct);">${octDigits[i]}</span>
      </div>
    `).join('');

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>3-Bit Grouping (2³ = 8)</strong></div>
          <div>Octal: <span class="math-res">0o${octDigits.join('')}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step 1: Group Bits into 3s from Right to Left</div>
          <p>Because $2^3 = 8$, each 3-bit binary triplet corresponds directly to one octal digit. ${rem !== 0 ? `Padded with ${3 - rem} leading zero(s).` : ''}</p>
          <div class="nibble-visual-row">
            ${groupBoxes}
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step 2: Combine Octal Digits</div>
          <p>Result: <strong class="font-mono" style="font-size: 1.2rem; color: var(--color-oct);">${octDigits.join('')}</strong><sub>8</sub></p>
        </div>
      </div>
    `;
  }

  /**
   * Method 6: Octal -> Binary (Expand to 3-bit groups)
   */
  function generateOctalToBinaryExplanation(octStr, bigVal) {
    let octChars = octStr.split('');
    let groups = [];

    for (const char of octChars) {
      let decVal = parseInt(char, 8);
      let binTriplet = decVal.toString(2).padStart(3, '0');
      groups.push({ char, binTriplet });
    }

    let groupBoxes = groups.map(item => `
      <div class="nibble-box">
        <span class="nibble-hex" style="color: var(--color-oct);">${item.char}</span>
        <span class="nibble-arrow">↓</span>
        <span class="nibble-bits" style="color: var(--color-bin);">${item.binTriplet}</span>
      </div>
    `).join('');

    let fullBin = groups.map(g => g.binTriplet).join('');
    let trimmedBin = bigVal.toString(2);

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Octal to 3-Bit Binary Expansion</strong></div>
          <div>Binary: <span class="math-res">${trimmedBin}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Step: Expand Each Octal Digit into 3 Binary Bits</div>
          <div class="nibble-visual-row">
            ${groupBoxes}
          </div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Final Binary Result</div>
          <p>Standard format: <strong class="font-mono" style="color: var(--color-bin); font-size: 1.2rem;">${trimmedBin}</strong><sub>2</sub></p>
        </div>
      </div>
    `;
  }

  /**
   * Method 7: Octal <-> Hexadecimal via 2-Phase Binary Bridge
   */
  function generateOctalHexBridgeExplanation(fromRadix, toRadix, cleanStr, bigVal) {
    const isOctToHex = fromRadix === 8;
    const binStr = bigVal.toString(2);
    const finalVal = isOctToHex ? bigVal.toString(16).toUpperCase() : bigVal.toString(8);

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Two-Phase Binary Bridge (${isOctToHex ? 'Octal → Binary → Hex' : 'Hex → Binary → Octal'})</strong></div>
          <div>Result: <span class="math-res">${finalVal}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Phase 1: Convert ${isOctToHex ? 'Octal to 3-Bit Binary' : 'Hexadecimal to 4-Bit Binary'}</div>
          <p>Direct symbol expansion to intermediate binary: <strong class="font-mono" style="color: var(--color-bin);">${binStr}</strong></p>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Phase 2: Regroup Binary into ${isOctToHex ? '4-Bit Nibbles for Hex' : '3-Bit Groups for Octal'}</div>
          <p>Regrouping from right-to-left gives final target base digits: 
            <strong class="font-mono" style="font-size: 1.2rem; color: ${isOctToHex ? 'var(--color-hex)' : 'var(--color-oct)'};">${finalVal}</strong>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Fallback Bridge through Decimal
   */
  function generateBridgeExplanation(fromRadix, toRadix, cleanStr, bigVal) {
    const decVal = bigVal.toString(10);
    const targetVal = bigIntToBaseString(bigVal, toRadix);

    return `
      <div class="exp-flow-block">
        <div class="exp-summary-banner">
          <div>Method: <strong>Decimal Bridge (${BASES[fromRadix].name} → Decimal → ${BASES[toRadix].name})</strong></div>
          <div>Result: <span class="math-res">${targetVal}</span></div>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Phase 1: ${BASES[fromRadix].name} to Decimal</div>
          <p>Calculated decimal value: <strong class="font-mono">${decVal}</strong></p>
        </div>

        <div class="step-card">
          <div class="exp-phase-title">Phase 2: Decimal to ${BASES[toRadix].name}</div>
          <p>Repeated division by ${toRadix} yields: <strong class="font-mono" style="color: var(--color-accent);">${targetVal}</strong></p>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // 6. INTERACTIVE BIT REGISTER INSPECTOR (TAB 2)
  // -------------------------------------------------------------------------
  function initBitboard() {
    renderBitCells();
    updateBitMetrics();
  }

  function setBitWidth(bits) {
    STATE.bitWidth = bits;
    const oldArray = STATE.bitArray;
    STATE.bitArray = new Array(bits).fill(0);
    for (let i = 0; i < Math.min(oldArray.length, bits); i++) {
      STATE.bitArray[i] = oldArray[i];
    }

    DOM.bitWidthBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.bits, 10) === bits);
    });

    renderBitCells();
    updateBitMetrics();
  }

  function renderBitCells() {
    DOM.bitCellsContainer.innerHTML = '';
    const bits = STATE.bitWidth;

    // Render bits from MSB (left) to LSB (right)
    for (let i = bits - 1; i >= 0; i--) {
      const bitVal = STATE.bitArray[i] || 0;
      const weight = 2 ** i;

      const cell = document.createElement('div');
      cell.className = 'bit-cell-unit';
      cell.innerHTML = `
        <span class="bit-weight-label">${weight > 999 ? (weight / 1024).toFixed(0) + 'k' : weight}</span>
        <button class="bit-toggle-btn ${bitVal === 1 ? 'bit-on' : ''}" data-bit-index="${i}" aria-label="Bit ${i}, value ${bitVal}">
          ${bitVal}
        </button>
        <span class="bit-index-badge">b${i}</span>
      `;
      DOM.bitCellsContainer.appendChild(cell);
    }

    // Render Nibble grouping labels
    renderNibbleBrackets();
  }

  function renderNibbleBrackets() {
    DOM.nibbleGroupsContainer.innerHTML = '';
    const nibbleCount = STATE.bitWidth / 4;

    for (let n = nibbleCount - 1; n >= 0; n--) {
      let nibVal = 0;
      for (let b = 0; b < 4; b++) {
        let bitIndex = n * 4 + b;
        if (STATE.bitArray[bitIndex] === 1) {
          nibVal += 2 ** b;
        }
      }
      const hexChar = nibVal.toString(16).toUpperCase();
      const bracket = document.createElement('div');
      bracket.className = 'nibble-group-bracket';
      bracket.innerHTML = `Nibble ${n}: <strong>0x${hexChar}</strong> (${nibVal})`;
      DOM.nibbleGroupsContainer.appendChild(bracket);
    }
  }

  function toggleBit(index) {
    if (index >= 0 && index < STATE.bitWidth) {
      STATE.bitArray[index] = STATE.bitArray[index] === 1 ? 0 : 1;
      renderBitCells();
      updateBitMetrics();
      syncConverterFromBitboard();
    }
  }

  function getBitboardUnsignedBigInt() {
    let big = 0n;
    for (let i = 0; i < STATE.bitWidth; i++) {
      if (STATE.bitArray[i] === 1) {
        big += 1n << BigInt(i);
      }
    }
    return big;
  }

  function syncBitboardFromBigInt(bigVal) {
    if (bigVal === null || bigVal < 0n) return;
    const bits = STATE.bitWidth;
    for (let i = 0; i < bits; i++) {
      STATE.bitArray[i] = Number((bigVal >> BigInt(i)) & 1n);
    }
    renderBitCells();
    updateBitMetrics();
  }

  function syncConverterFromBitboard() {
    const bigVal = getBitboardUnsignedBigInt();
    STATE.isSyncing = true;
    DOM.inputDec.value = bigVal.toString(10);
    DOM.inputBin.value = bigIntToBaseString(bigVal, 2, STATE.formatNibbles);
    DOM.inputHex.value = bigVal.toString(16).toUpperCase();
    DOM.inputOct.value = bigVal.toString(8);
    clearAllValidationMessages();
    updateCharCounts(bigVal);
    updateExplanation(10, parseInt(DOM.expToSelect.value, 10), bigVal.toString(10));
    STATE.isSyncing = false;
  }

  function updateBitMetrics() {
    const unsignedVal = Number(getBitboardUnsignedBigInt());
    const bits = STATE.bitWidth;

    // Signed 2's Complement
    let signedVal = unsignedVal;
    let msb = STATE.bitArray[bits - 1];
    if (msb === 1) {
      signedVal = unsignedVal - (2 ** bits);
    }

    DOM.bitMetricUnsigned.textContent = unsignedVal;
    DOM.bitMetricSigned.textContent = signedVal > 0 ? `+${signedVal}` : signedVal;

    // Hex and Octal
    const hexPad = bits / 4;
    DOM.bitMetricHex.textContent = '0x' + unsignedVal.toString(16).toUpperCase().padStart(hexPad, '0');
    DOM.bitMetricOct.textContent = '0o' + unsignedVal.toString(8);

    // ASCII
    if (bits === 8) {
      const asciiInfo = getAsciiDescription(unsignedVal);
      DOM.bitMetricAscii.textContent = asciiInfo.char;
      DOM.bitMetricAsciiDesc.textContent = asciiInfo.desc;
    } else {
      const lowByte = unsignedVal & 0xFF;
      const asciiInfo = getAsciiDescription(lowByte);
      DOM.bitMetricAscii.textContent = asciiInfo.char;
      DOM.bitMetricAsciiDesc.textContent = `Low Byte: ${asciiInfo.desc}`;
    }

    // Parity / 1-count
    let onesCount = STATE.bitArray.filter(b => b === 1).length;
    DOM.bitMetricOnes.textContent = onesCount;
    DOM.bitMetricParity.textContent = (onesCount % 2 === 0) ? `Even (${onesCount} ones)` : `Odd (${onesCount} ones)`;
  }

  function getAsciiDescription(code) {
    if (code >= 32 && code <= 126) {
      return { char: `'${String.fromCharCode(code)}'`, desc: `Printable Symbol (${code})` };
    }
    const controlNames = {
      0: 'NUL (Null char)', 7: 'BEL (Bell)', 8: 'BS (Backspace)',
      9: 'HT (Tab)', 10: 'LF (Line Feed)', 13: 'CR (Carriage Return)',
      27: 'ESC (Escape)', 32: 'SP (Space)', 127: 'DEL (Delete)'
    };
    if (controlNames[code]) {
      return { char: controlNames[code].split(' ')[0], desc: controlNames[code] };
    }
    if (code < 32) return { char: 'CTRL', desc: `Control Code (0x${code.toString(16).toUpperCase()})` };
    return { char: 'EXT', desc: 'Extended ASCII / Non-ASCII' };
  }

  // -------------------------------------------------------------------------
  // 7. LEARNING ACADEMY (CHEAT SHEET GENERATOR)
  // -------------------------------------------------------------------------
  function renderAcademyCheatTable() {
    if (!DOM.cheatTableBody) return;
    let rows = [];

    const asciiDescriptions = [
      'NUL (Null)', 'SOH (Start of Heading)', 'STX (Start of Text)', 'ETX (End of Text)',
      'EOT (End of Trans)', 'ENQ (Enquiry)', 'ACK (Acknowledge)', 'BEL (Bell)',
      'BS (Backspace)', 'HT (Horizontal Tab)', 'LF (Line Feed)', 'VT (Vertical Tab)',
      'FF (Form Feed)', 'CR (Carriage Return)', 'SO (Shift Out)', 'SI (Shift In)'
    ];

    for (let i = 0; i <= 15; i++) {
      let bin = i.toString(2).padStart(4, '0');
      let oct = i.toString(8).padStart(2, '0');
      let hex = i.toString(16).toUpperCase();
      let desc = asciiDescriptions[i] || '';

      rows.push(`
        <tr>
          <td><strong>${i}</strong></td>
          <td style="color: var(--color-bin); font-weight: 700;">${bin}</td>
          <td style="color: var(--color-oct);">${oct}</td>
          <td style="color: var(--color-hex); font-weight: 700;">0x${hex}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${desc}</td>
        </tr>
      `);
    }
    DOM.cheatTableBody.innerHTML = rows.join('');
  }

  // -------------------------------------------------------------------------
  // 8. PRACTICE QUIZ ARENA (TAB 4)
  // -------------------------------------------------------------------------
  function initQuiz() {
    loadQuizStats();
    generateNewQuizQuestion();
  }

  function loadQuizStats() {
    const saved = localStorage.getItem('numberlab_quiz_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        STATE.quiz.score = parsed.score || 0;
        STATE.quiz.streak = parsed.streak || 0;
        STATE.quiz.bestStreak = parsed.bestStreak || 0;
        STATE.quiz.totalAnswered = parsed.totalAnswered || 0;
        STATE.quiz.totalCorrect = parsed.totalCorrect || 0;
      } catch {
        // ignore parse error
      }
    }
    updateQuizStatsDisplay();
  }

  function saveQuizStats() {
    localStorage.setItem('numberlab_quiz_stats', JSON.stringify({
      score: STATE.quiz.score,
      streak: STATE.quiz.streak,
      bestStreak: STATE.quiz.bestStreak,
      totalAnswered: STATE.quiz.totalAnswered,
      totalCorrect: STATE.quiz.totalCorrect
    }));
  }

  function updateQuizStatsDisplay() {
    DOM.quizScore.textContent = STATE.quiz.score;
    DOM.quizStreak.textContent = `${STATE.quiz.streak} 🔥`;
    DOM.quizBestStreak.textContent = STATE.quiz.bestStreak;

    const acc = STATE.quiz.totalAnswered === 0
      ? 100
      : Math.round((STATE.quiz.totalCorrect / STATE.quiz.totalAnswered) * 100);
    DOM.quizAccuracy.textContent = `${acc}%`;
  }

  function generateNewQuizQuestion() {
    STATE.quiz.answered = false;
    DOM.quizFeedbackBanner.classList.add('hidden');

    const diff = DOM.quizDifficulty.value;
    const mode = DOM.quizMode.value;

    let maxNum;
    if (diff === 'easy') maxNum = 15;
    else if (diff === 'medium') maxNum = 255;
    else maxNum = 4095;

    // Pick random value
    const val = Math.floor(Math.random() * maxNum) + 1;

    // Pick source and target bases based on mode
    let fromRadix, toRadix;
    const basePairs = {
      'bin-dec': [[2, 10], [10, 2]],
      'bin-hex': [[2, 16], [16, 2]],
      'oct-bin': [[8, 2], [2, 8]],
      'dec-hex': [[10, 16], [16, 10]]
    };

    if (mode === 'all' || !basePairs[mode]) {
      const allBases = [2, 8, 10, 16];
      fromRadix = allBases[Math.floor(Math.random() * allBases.length)];
      let remaining = allBases.filter(b => b !== fromRadix);
      toRadix = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      const pair = basePairs[mode][Math.floor(Math.random() * basePairs[mode].length)];
      fromRadix = pair[0];
      toRadix = pair[1];
    }

    const sourceStr = val.toString(fromRadix).toUpperCase();
    const correctTargetStr = val.toString(toRadix).toUpperCase();

    // Generate 3 plausible distractors
    const options = generateDistractors(val, toRadix, correctTargetStr);

    STATE.quiz.currentQuestion = {
      val,
      fromRadix,
      toRadix,
      sourceStr,
      correctTargetStr,
      options
    };

    renderQuizQuestion();
  }

  function generateDistractors(correctVal, targetRadix, correctStr) {
    const distractors = new Set([correctStr]);
    const deltas = [-2, -1, 1, 2, 4, 8, 16, -16];

    while (distractors.size < 4) {
      let delta = deltas[Math.floor(Math.random() * deltas.length)];
      let candidateVal = correctVal + delta;
      if (candidateVal <= 0) candidateVal = Math.abs(candidateVal) + 3;

      let candidateStr = candidateVal.toString(targetRadix).toUpperCase();
      distractors.add(candidateStr);
    }

    // Shuffle
    const arr = Array.from(distractors);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderQuizQuestion() {
    const q = STATE.quiz.currentQuestion;
    if (!q) return;

    DOM.quizQIndex.textContent = `Question #${STATE.quiz.totalAnswered + 1}`;
    DOM.quizQDiff.textContent = DOM.quizDifficulty.options[DOM.quizDifficulty.selectedIndex].text.split(' ')[0];
    DOM.quizTargetBaseName.textContent = `${BASES[q.toRadix].name} (Base ${q.toRadix})`;
    DOM.quizSourceValue.textContent = q.sourceStr;
    DOM.quizSourceBaseBadge.textContent = `${BASES[q.fromRadix].tag} (Base ${q.fromRadix})`;

    DOM.quizOptionsContainer.innerHTML = '';
    q.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.dataset.option = optText;
      btn.innerHTML = `
        <span class="opt-val">${optText}</span>
        <span class="opt-indicator">${String.fromCharCode(65 + index)}</span>
      `;
      btn.addEventListener('click', () => handleQuizAnswer(optText, btn));
      DOM.quizOptionsContainer.appendChild(btn);
    });
  }

  function handleQuizAnswer(selectedOption, selectedBtn) {
    if (STATE.quiz.answered) return;
    STATE.quiz.answered = true;

    const q = STATE.quiz.currentQuestion;
    const isCorrect = selectedOption === q.correctTargetStr;

    STATE.quiz.totalAnswered++;

    if (isCorrect) {
      STATE.quiz.score += 10 + (STATE.quiz.streak * 2);
      STATE.quiz.streak++;
      STATE.quiz.totalCorrect++;
      if (STATE.quiz.streak > STATE.quiz.bestStreak) {
        STATE.quiz.bestStreak = STATE.quiz.streak;
      }
      selectedBtn.classList.add('correct');
      showQuizFeedback(true, q);
    } else {
      STATE.quiz.streak = 0;
      selectedBtn.classList.add('incorrect');
      // Highlight correct button
      const allBtns = DOM.quizOptionsContainer.querySelectorAll('.quiz-opt-btn');
      allBtns.forEach(b => {
        if (b.dataset.option === q.correctTargetStr) {
          b.classList.add('correct');
        }
      });
      showQuizFeedback(false, q);
    }

    saveQuizStats();
    updateQuizStatsDisplay();
  }

  function showQuizFeedback(isCorrect, q) {
    DOM.quizFeedbackBanner.classList.remove('hidden', 'feedback-correct', 'feedback-wrong');

    if (isCorrect) {
      DOM.quizFeedbackBanner.classList.add('feedback-correct');
      DOM.feedbackIcon.textContent = '✓';
      DOM.feedbackTitle.textContent = 'Spot on! Correct answer.';
      DOM.feedbackDesc.textContent = `${q.sourceStr} (${BASES[q.fromRadix].name}) = ${q.correctTargetStr} (${BASES[q.toRadix].name})`;
    } else {
      DOM.quizFeedbackBanner.classList.add('feedback-wrong');
      DOM.feedbackIcon.textContent = '✕';
      DOM.feedbackTitle.textContent = 'Not quite!';
      DOM.feedbackDesc.textContent = `Correct answer is ${q.correctTargetStr} (${BASES[q.toRadix].name}).`;
    }
  }

  // -------------------------------------------------------------------------
  // 9. CONVERSION HISTORY & PERSISTENCE (TAB 5)
  // -------------------------------------------------------------------------
  let historyDebounceTimer = null;
  function recordHistoryDebounced(radix, sourceClean, bigVal) {
    clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(() => {
      addHistoryRecord(radix, sourceClean, bigVal);
    }, 600);
  }

  function addHistoryRecord(radix, sourceClean, bigVal) {
    if (!sourceClean || bigVal === null) return;

    const record = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sourceRadix: radix,
      sourceVal: sourceClean,
      dec: bigVal.toString(10),
      bin: bigVal.toString(2),
      hex: bigVal.toString(16).toUpperCase(),
      oct: bigVal.toString(8)
    };

    // Avoid duplicate immediate logging of same input
    if (STATE.history.length > 0 && STATE.history[0].dec === record.dec) {
      return;
    }

    STATE.history.unshift(record);
    if (STATE.history.length > 50) STATE.history.pop(); // keep last 50
    saveHistory();
    renderHistoryList();
  }

  function loadHistory() {
    const saved = localStorage.getItem('numberlab_history');
    if (saved) {
      try {
        STATE.history = JSON.parse(saved);
      } catch {
        STATE.history = [];
      }
    }
    renderHistoryList();
  }

  function saveHistory() {
    localStorage.setItem('numberlab_history', JSON.stringify(STATE.history));
  }

  function renderHistoryList() {
    if (!DOM.historyList) return;
    DOM.historyBadge.textContent = STATE.history.length;

    if (STATE.history.length === 0) {
      DOM.historyEmptyState.style.display = 'block';
      DOM.historyList.innerHTML = '';
      return;
    }

    DOM.historyEmptyState.style.display = 'none';
    DOM.historyList.innerHTML = STATE.history.map(item => `
      <div class="history-item">
        <div class="hist-left">
          <span class="hist-time">${item.time}</span>
          <div class="hist-source-wrap">
            <span class="base-tag tag-${BASES[item.sourceRadix].tag.toLowerCase()}">${BASES[item.sourceRadix].tag}</span>
            <span class="hist-val">${item.sourceVal}</span>
          </div>
          <div class="hist-results-row">
            <span class="hist-pill">DEC: ${item.dec}</span>
            <span class="hist-pill">BIN: ${item.bin.length > 16 ? item.bin.slice(0, 14) + '...' : item.bin}</span>
            <span class="hist-pill">HEX: 0x${item.hex}</span>
            <span class="hist-pill">OCT: 0o${item.oct}</span>
          </div>
        </div>
        <div class="hist-actions">
          <button class="icon-btn hist-restore-btn" data-hist-id="${item.id}" title="Load into converter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            <span>Restore</span>
          </button>
          <button class="icon-btn hist-copy-btn" data-hist-id="${item.id}" title="Copy full record">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // -------------------------------------------------------------------------
  // 10. UI UTILITIES & EVENT LISTENERS
  // -------------------------------------------------------------------------
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${message}</span>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2400);
  }

  function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage, 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMessage, 'success');
    });
  }

  function switchTab(tabId) {
    STATE.activeTab = tabId;

    DOM.navTabs.forEach(tab => {
      const isTarget = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget);
    });

    DOM.tabPanels.forEach(panel => {
      const isTarget = panel.id === `panel-${tabId}`;
      panel.classList.toggle('active', isTarget);
    });
  }

  function setupEventListeners() {
    // 1. Theme toggle
    DOM.themeToggle.addEventListener('click', () => {
      const current = DOM.html.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      DOM.html.setAttribute('data-theme', next);
      localStorage.setItem('numberlab_theme', next);
    });

    // 2. Navigation tabs
    DOM.navTabs.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 3. Converter live inputs
    DOM.inputDec.addEventListener('input', (e) => handleInputSync(10, e.target.value));
    DOM.inputBin.addEventListener('input', (e) => handleInputSync(2, e.target.value));
    DOM.inputHex.addEventListener('input', (e) => handleInputSync(16, e.target.value));
    DOM.inputOct.addEventListener('input', (e) => handleInputSync(8, e.target.value));

    // Focus tracking for virtual keypad
    [DOM.inputDec, DOM.inputBin, DOM.inputHex, DOM.inputOct].forEach(inp => {
      inp.addEventListener('focus', () => {
        STATE.lastFocusedInput = inp;
      });
    });

    // 4. Quick Presets
    DOM.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.preset;
        const base = parseInt(btn.dataset.base, 10);
        const map = { 10: DOM.inputDec, 2: DOM.inputBin, 16: DOM.inputHex, 8: DOM.inputOct };
        const inp = map[base];
        if (inp) {
          inp.value = val;
          handleInputSync(base, val);
          inp.focus();
        }
      });
    });

    // 5. Random number generator preset
    DOM.btnRandomNumber.addEventListener('click', () => {
      const rand = Math.floor(Math.random() * 65535) + 1;
      DOM.inputDec.value = rand.toString(10);
      handleInputSync(10, rand.toString(10));
      showToast(`Loaded random number: ${rand}`, 'success');
    });

    // 6. Clear All
    DOM.btnClearAll.addEventListener('click', () => {
      clearAllFields(true);
      renderExplanationPlaceholder();
      showToast('All fields cleared', 'success');
    });

    // 7. Toggle 4-bit nibbles in binary card
    DOM.btnToggleNibbles.addEventListener('click', () => {
      STATE.formatNibbles = !STATE.formatNibbles;
      DOM.btnToggleNibbles.classList.toggle('active', STATE.formatNibbles);
      if (DOM.inputDec.value) {
        handleInputSync(10, DOM.inputDec.value);
      }
      showToast(`Binary nibble formatting ${STATE.formatNibbles ? 'enabled' : 'disabled'}`);
    });

    // 8. Copy Buttons on Cards
    DOM.copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.copyTarget;
        const targetInput = document.getElementById(targetId);
        if (targetInput && targetInput.value) {
          copyToClipboard(targetInput.value);
        } else {
          showToast('Field is empty', 'error');
        }
      });
    });

    // 9. Explain buttons on Cards
    DOM.explainBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fromBase = btn.dataset.fromBase;
        DOM.expFromSelect.value = fromBase;
        const currentInput = {
          10: DOM.inputDec.value,
          2: DOM.inputBin.value,
          16: DOM.inputHex.value,
          8: DOM.inputOct.value
        }[fromBase];

        updateExplanation(parseInt(fromBase, 10), parseInt(DOM.expToSelect.value, 10), currentInput);
        document.getElementById('section-explanation').scrollIntoView({ behavior: 'smooth' });
      });
    });

    // 10. Explanation pair selectors
    DOM.expFromSelect.addEventListener('change', () => {
      const fromRadix = parseInt(DOM.expFromSelect.value, 10);
      const toRadix = parseInt(DOM.expToSelect.value, 10);
      const inputMap = { 10: DOM.inputDec.value, 2: DOM.inputBin.value, 16: DOM.inputHex.value, 8: DOM.inputOct.value };
      updateExplanation(fromRadix, toRadix, inputMap[fromRadix]);
    });

    DOM.expToSelect.addEventListener('change', () => {
      const fromRadix = parseInt(DOM.expFromSelect.value, 10);
      const toRadix = parseInt(DOM.expToSelect.value, 10);
      const inputMap = { 10: DOM.inputDec.value, 2: DOM.inputBin.value, 16: DOM.inputHex.value, 8: DOM.inputOct.value };
      updateExplanation(fromRadix, toRadix, inputMap[fromRadix]);
    });

    // 11. Copy Step-by-Step Notes
    DOM.btnCopySteps.addEventListener('click', () => {
      const notes = DOM.expContainer.innerText;
      if (notes && !notes.includes('No number entered yet')) {
        copyToClipboard(notes, 'Step-by-step notes copied!');
      } else {
        showToast('No solution to copy', 'error');
      }
    });

    // 12. Virtual Keypad
    DOM.keypadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const target = STATE.lastFocusedInput || DOM.inputDec;
        target.value += key;
        const radix = target === DOM.inputDec ? 10 :
                      target === DOM.inputBin ? 2 :
                      target === DOM.inputHex ? 16 : 8;
        handleInputSync(radix, target.value);
      });
    });

    DOM.keyBackspace.addEventListener('click', () => {
      const target = STATE.lastFocusedInput || DOM.inputDec;
      if (target.value.length > 0) {
        target.value = target.value.slice(0, -1);
        const radix = target === DOM.inputDec ? 10 :
                      target === DOM.inputBin ? 2 :
                      target === DOM.inputHex ? 16 : 8;
        handleInputSync(radix, target.value);
      }
    });

    DOM.keyClearFocused.addEventListener('click', () => {
      const target = STATE.lastFocusedInput || DOM.inputDec;
      target.value = '';
      const radix = target === DOM.inputDec ? 10 :
                    target === DOM.inputBin ? 2 :
                    target === DOM.inputHex ? 16 : 8;
      handleInputSync(radix, '');
    });

    // 13. Bitboard Actions
    DOM.bitCellsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.bit-toggle-btn');
      if (btn) {
        const index = parseInt(btn.dataset.bitIndex, 10);
        toggleBit(index);
      }
    });

    DOM.bitWidthBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setBitWidth(parseInt(btn.dataset.bits, 10));
      });
    });

    DOM.btnInvertBits.addEventListener('click', () => {
      for (let i = 0; i < STATE.bitWidth; i++) {
        STATE.bitArray[i] = STATE.bitArray[i] === 1 ? 0 : 1;
      }
      renderBitCells();
      updateBitMetrics();
      syncConverterFromBitboard();
      showToast('Bitwise NOT applied');
    });

    DOM.btnSetAllBits.addEventListener('click', () => {
      STATE.bitArray.fill(1);
      renderBitCells();
      updateBitMetrics();
      syncConverterFromBitboard();
    });

    DOM.btnClearBits.addEventListener('click', () => {
      STATE.bitArray.fill(0);
      renderBitCells();
      updateBitMetrics();
      syncConverterFromBitboard();
    });

    // 14. Quiz Arena Actions
    DOM.btnNewQuestion.addEventListener('click', generateNewQuizQuestion);
    DOM.quizDifficulty.addEventListener('change', generateNewQuizQuestion);
    DOM.quizMode.addEventListener('change', generateNewQuizQuestion);

    DOM.btnResetQuizStats.addEventListener('click', () => {
      if (confirm('Reset quiz stats and streak?')) {
        STATE.quiz.score = 0;
        STATE.quiz.streak = 0;
        STATE.quiz.bestStreak = 0;
        STATE.quiz.totalAnswered = 0;
        STATE.quiz.totalCorrect = 0;
        saveQuizStats();
        updateQuizStatsDisplay();
        showToast('Quiz statistics reset');
      }
    });

    DOM.btnQuizShowSteps.addEventListener('click', () => {
      const q = STATE.quiz.currentQuestion;
      if (!q) return;
      // Switch to converter tab and populate with quiz question
      switchTab('converter');
      DOM.expFromSelect.value = q.fromRadix.toString();
      DOM.expToSelect.value = q.toRadix.toString();

      const map = { 10: DOM.inputDec, 2: DOM.inputBin, 16: DOM.inputHex, 8: DOM.inputOct };
      map[q.fromRadix].value = q.sourceStr;
      handleInputSync(q.fromRadix, q.sourceStr);

      setTimeout(() => {
        document.getElementById('section-explanation').scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // 15. History Actions
    DOM.btnClearHistory.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your conversion history?')) {
        STATE.history = [];
        saveHistory();
        renderHistoryList();
        showToast('Conversion history cleared');
      }
    });

    DOM.btnExportHistory.addEventListener('click', () => {
      if (STATE.history.length === 0) {
        showToast('History is empty', 'error');
        return;
      }
      const jsonStr = JSON.stringify(STATE.history, null, 2);
      copyToClipboard(jsonStr, 'History exported as JSON to clipboard!');
    });

    DOM.historyList.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('.hist-restore-btn');
      if (restoreBtn) {
        const id = parseInt(restoreBtn.dataset.histId, 10);
        const record = STATE.history.find(r => r.id === id);
        if (record) {
          switchTab('converter');
          const map = { 10: DOM.inputDec, 2: DOM.inputBin, 16: DOM.inputHex, 8: DOM.inputOct };
          map[record.sourceRadix].value = record.sourceVal;
          handleInputSync(record.sourceRadix, record.sourceVal);
          showToast(`Restored ${record.sourceVal} (${BASES[record.sourceRadix].name})`);
        }
        return;
      }

      const copyBtn = e.target.closest('.hist-copy-btn');
      if (copyBtn) {
        const id = parseInt(copyBtn.dataset.histId, 10);
        const record = STATE.history.find(r => r.id === id);
        if (record) {
          const summary = `Decimal: ${record.dec} | Binary: ${record.bin} | Hex: 0x${record.hex} | Octal: 0o${record.oct}`;
          copyToClipboard(summary, 'Record copied to clipboard!');
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 11. INITIALIZATION
  // -------------------------------------------------------------------------
  function initApp() {
    // 1. Theme setup
    DOM.html.setAttribute('data-theme', STATE.theme);

    // 2. Setup Bitboard
    initBitboard();

    // 3. Setup Academy table
    renderAcademyCheatTable();

    // 4. Setup Quiz
    initQuiz();

    // 5. Setup History
    loadHistory();

    // 6. Setup Listeners
    setupEventListeners();

    // 7. Load default initial demo value: 42
    DOM.inputDec.value = '42';
    handleInputSync(10, '42');

    console.log('NumberLab — Number System Explorer loaded successfully.');
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
