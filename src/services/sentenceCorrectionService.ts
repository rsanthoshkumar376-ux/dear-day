// Smart Sentence Correction & Formation Engine for Voice Diary
// Corrects spoken slips, grammatical errors, missing tenses, fillers, and colloquialisms into proper diary sentences.

import { isTamilText } from './speechService';

/**
 * Clean spoken filler words and stuttering in English.
 */
function cleanEnglishFillersAndStutter(text: string): string {
  let cleaned = text;

  // 1. Remove spoken fillers
  cleaned = cleaned.replace(/\b(uh|um|umm|er|ah|like|you know|so yeah|basically|sort of)\b/gi, '');

  // 2. Remove duplicate stuttered words (e.g. "I I", "and and", "to to")
  cleaned = cleaned.replace(/\b([a-zA-Z]+)\s+\1\b/gi, '$1');
  cleaned = cleaned.replace(/\b([a-zA-Z]+)\s+\1\b/gi, '$1');

  // 3. Normalize whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

/**
 * Fix English contractions, pronouns, and capitalization.
 */
function fixEnglishPronounsAndContractions(text: string): string {
  let cleaned = text;

  // Capitalize standalone "i"
  cleaned = cleaned.replace(/\bi\b/g, 'I');

  // Contractions
  const contractionMap: Record<string, string> = {
    "\\bim\\b": "I'm",
    "\\bi'm\\b": "I'm",
    "\\bive\\b": "I've",
    "\\bi've\\b": "I've",
    "\\bill\\b": "I'll",
    "\\bi'll\\b": "I'll",
    "\\bid\\b": "I'd",
    "\\bi'd\\b": "I'd",
    "\\bdont\\b": "don't",
    "\\bcant\\b": "can't",
    "\\bdidnt\\b": "didn't",
    "\\bwont\\b": "won't",
    "\\bisnt\\b": "isn't",
    "\\barent\\b": "aren't",
    "\\bwasnt\\b": "wasn't",
    "\\bwerent\\b": "weren't",
    "\\bcouldnt\\b": "couldn't",
    "\\bshouldnt\\b": "shouldn't",
    "\\bwouldnt\\b": "wouldn't",
    "\\bhaven't\\b": "haven't",
    "\\bhavent\\b": "haven't",
    "\\bhasnt\\b": "hasn't",
  };

  for (const [pattern, replacement] of Object.entries(contractionMap)) {
    cleaned = cleaned.replace(new RegExp(pattern, 'gi'), replacement);
  }

  // Days of week
  const days: Record<string, string> = {
    "\\bmonday\\b": "Monday",
    "\\btuesday\\b": "Tuesday",
    "\\bwednesday\\b": "Wednesday",
    "\\bthursday\\b": "Thursday",
    "\\bfriday\\b": "Friday",
    "\\bsaturday\\b": "Saturday",
    "\\bsunday\\b": "Sunday",
  };
  for (const [pattern, replacement] of Object.entries(days)) {
    cleaned = cleaned.replace(new RegExp(pattern, 'gi'), replacement);
  }

  return cleaned;
}

/**
 * Fix common spoken grammatical errors & tense slips into proper diary prose.
 */
function fixEnglishGrammarAndTense(text: string): string {
  let cleaned = text;

  // Time expressions
  cleaned = cleaned.replace(/\btoday morning\b/gi, 'this morning');
  cleaned = cleaned.replace(/\btoday afternoon\b/gi, 'this afternoon');
  cleaned = cleaned.replace(/\btoday evening\b/gi, 'this evening');
  cleaned = cleaned.replace(/\btoday night\b/gi, 'tonight');
  cleaned = cleaned.replace(/\byesterday night\b/gi, 'last night');

  // "Me and [X]" at subject position -> "[X] and I"
  cleaned = cleaned.replace(
    /\bme and my ([a-zA-Z]+)\b/gi,
    'my $1 and I'
  );
  cleaned = cleaned.replace(
    /\bme and ([a-zA-Z]+)\b/gi,
    '$1 and I'
  );

  // Common spoken tense mistakes when recounting the day ("I go" -> "I went", "I eat" -> "I ate")
  cleaned = cleaned.replace(/\bI go to\b/g, 'I went to');
  cleaned = cleaned.replace(/\bI take a\b/g, 'I took a');
  cleaned = cleaned.replace(/\bI come back\b/g, 'I came back');
  cleaned = cleaned.replace(/\bI meet my\b/g, 'I met my');
  cleaned = cleaned.replace(/\bI meet with\b/g, 'I met with');
  cleaned = cleaned.replace(/\bI see my\b/g, 'I saw my');
  cleaned = cleaned.replace(/\bI feel so\b/g, 'I felt so');
  cleaned = cleaned.replace(/\bI feel very\b/g, 'I felt very');
  cleaned = cleaned.replace(/\bI feel really\b/g, 'I felt really');
  cleaned = cleaned.replace(/\bI feel tired\b/g, 'I felt tired');
  cleaned = cleaned.replace(/\bI feel happy\b/g, 'I felt happy');
  cleaned = cleaned.replace(/\bI buy\b/g, 'I bought');
  cleaned = cleaned.replace(/\bI sleep\b/g, 'I slept');
  cleaned = cleaned.replace(/\bI wake up\b/g, 'I woke up');
  cleaned = cleaned.replace(/\bI drink\b/g, 'I drank');
  cleaned = cleaned.replace(/\bI eat breakfast\b/g, 'I ate breakfast');
  cleaned = cleaned.replace(/\bI eat lunch\b/g, 'I ate lunch');
  cleaned = cleaned.replace(/\bI eat dinner\b/g, 'I ate dinner');
  cleaned = cleaned.replace(/\bI have breakfast\b/g, 'I had breakfast');
  cleaned = cleaned.replace(/\bI have lunch\b/g, 'I had lunch');
  cleaned = cleaned.replace(/\bI have dinner\b/g, 'I had dinner');
  cleaned = cleaned.replace(/\bI have a good\b/g, 'I had a good');
  cleaned = cleaned.replace(/\bI have a great\b/g, 'I had a great');
  cleaned = cleaned.replace(/\bI have a busy\b/g, 'I had a busy');
  cleaned = cleaned.replace(/\bI talk to\b/g, 'I talked to');
  cleaned = cleaned.replace(/\bI talk with\b/g, 'I talked with');
  cleaned = cleaned.replace(/\bI speak with\b/g, 'I spoke with');
  cleaned = cleaned.replace(/\bI make lunch\b/g, 'I made lunch');
  cleaned = cleaned.replace(/\bI make dinner\b/g, 'I made dinner');
  cleaned = cleaned.replace(/\bI finish my\b/g, 'I finished my');
  cleaned = cleaned.replace(/\bI complete my\b/g, 'I completed my');
  cleaned = cleaned.replace(/\bI spend time\b/g, 'I spent time');
  cleaned = cleaned.replace(/\bI read a\b/g, 'I read a');

  // Grammar agreement
  cleaned = cleaned.replace(/\bthere is many\b/gi, 'there are many');
  cleaned = cleaned.replace(/\bthere was many\b/gi, 'there were many');
  cleaned = cleaned.replace(/\bcould of\b/gi, 'could have');
  cleaned = cleaned.replace(/\bshould of\b/gi, 'should have');
  cleaned = cleaned.replace(/\bwould of\b/gi, 'would have');

  return cleaned;
}

/**
 * Format English sentence into a complete, clean diary sentence with proper punctuation.
 */
export function formatEnglishSentence(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  let text = cleanEnglishFillersAndStutter(rawText.trim());
  text = fixEnglishPronounsAndContractions(text);
  text = fixEnglishGrammarAndTense(text);

  // Capitalize first character of sentence
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Ensure proper end punctuation (. ? !)
  if (!/[.?!]$/.test(text)) {
    text = text + '.';
  }

  return text;
}

const TAMIL_SPOKEN_MAP: Record<string, string> = {
  'இன்னைக்கு': 'இன்று',
  'இன்னைக்கி': 'இன்று',
  'நேத்து': 'நேற்று',
  'நேத்திக்கு': 'நேற்று',
  'நாளைக்கு': 'நாளை',
  'காலைல': 'காலையில்',
  'காலைலேயே': 'காலையில்',
  'சாயங்காலம்': 'மாலையில்',
  'சாயந்திரம்': 'மாலையில்',
  'ஈவினிங்': 'மாலையில்',
  'நைட்': 'இரவில்',
  'நைட்டு': 'இரவில்',
  'மதியானம்': 'மதியம்',
  'போயிட்டு': 'சென்றுவிட்டு',
  'போய்ட்டு': 'சென்றுவிட்டு',
  'வந்துட்டு': 'வந்துவிட்டு',
  'வந்துட்டேன்': 'வந்துவிட்டேன்',
  'பண்ணினேன்': 'செய்தேன்',
  'பண்ணேன்': 'செய்தேன்',
  'பாத்தேன்': 'பார்த்தேன்',
  'பார்த்தன்': 'பார்த்தேன்',
  'சாப்ட்டேன்': 'சாப்பிட்டேன்',
  'சாப்பிட்டன்': 'சாப்பிட்டேன்',
  'வந்தன்': 'வந்தேன்',
  'போனன்': 'சென்றேன்',
  'தூங்குனேன்': 'தூங்கினேன்',
  'படிச்சேன்': 'படித்தேன்',
  'பேசுனேன்': 'பேசினேன்',
  'கேட்டன்': 'கேட்டேன்',
  'செஞ்சேன்': 'செய்தேன்',
  'ரொம்ப': 'மிகவும்',
  'கொஞ்சம்': 'சிறிது',
  'அப்றம்': 'பிறகு',
  'அப்புறம்': 'பிறகு',
  'நல்லா': 'நன்றாக',
  'டயர்டா': 'களைப்பாக',
  'ஹாப்பியா': 'மகிழ்ச்சியாக',
  'டென்ஷனா': 'பதற்றமாக',
  'பிரண்ட்ஸ்': 'நண்பர்கள்',
  'ஆபீஸ்': 'அலுவலகம்',
  'ஸ்கூல்': 'பள்ளி',
  'காலேஜ்': 'கல்லூரி',
};

/**
 * Clean and format Tamil speech into written diary prose.
 * Replaces spoken colloquialisms with grammatically correct Tamil words.
 */
export function formatTamilSentence(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  let cleaned = rawText.trim();

  // 1. Remove spoken fillers
  const fillers = ['ஆங்', 'ம்ம்', 'அதாவது', 'ஆமா'];
  for (const filler of fillers) {
    const fillerRegex = new RegExp(`(^|[\\s.,!?;:])(${filler})($|[\\s.,!?;:])`, 'g');
    cleaned = cleaned.replace(fillerRegex, '$1$3');
  }

  // 2. Remove duplicate words
  cleaned = cleaned.replace(/([\u0B80-\u0BFF]+)\s+\1/g, '$1');

  // 3. Spoken Colloquialisms -> Written Diary Tamil
  for (const [spoken, written] of Object.entries(TAMIL_SPOKEN_MAP)) {
    const regex = new RegExp(`(^|[\\s.,!?;:()—–])(${spoken})($|[\\s.,!?;:()—–])`, 'g');
    cleaned = cleaned.replace(regex, `$1${written}$3`);
    cleaned = cleaned.replace(regex, `$1${written}$3`);
  }

  // Normalize spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Ensure sentence ends with period
  if (!/[.?!।]$/.test(cleaned)) {
    cleaned = cleaned + '.';
  }

  return cleaned;
}

/**
 * Universal Sentence Auto-Correction.
 * Immediately fixes grammar, tenses, fillers, and punctuation
 * based on language detection (English or Tamil).
 */
export function correctAndFormatSentence(rawText: string, preferredLang: 'en' | 'ta' = 'en'): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  const isTamil = preferredLang === 'ta' || isTamilText(trimmed);
  if (isTamil) {
    return formatTamilSentence(trimmed);
  } else {
    return formatEnglishSentence(trimmed);
  }
}

/**
 * Smart Sentence Merger: Merges a new corrected sentence into the existing diary text
 * ensuring seamless paragraph flow and proper sentence separation.
 */
export function mergeCorrectedSentenceIntoDiary(existingText: string, newCorrectedSentence: string): string {
  const cleanNew = newCorrectedSentence.trim();
  if (!cleanNew) return existingText;

  const cleanExisting = existingText.trim();
  if (!cleanExisting) {
    return cleanNew;
  }

  // If existing text already ends with punctuation, add a single space
  const endsWithPunctuation = /[.?!;:\n]$/.test(cleanExisting);
  const separator = endsWithPunctuation ? ' ' : '. ';

  return cleanExisting + separator + cleanNew;
}

/**
 * Enhanced Sentence Correction:
 * Uses fast client-side rules immediately, and if online, can asynchronously
 * enhance the sentence with LLM accuracy.
 */
export async function enhanceSentenceWithAi(
  rawSentence: string,
  preferredLang: 'en' | 'ta' = 'en',
  userName: string = 'friend'
): Promise<string> {
  const localCorrected = correctAndFormatSentence(rawSentence, preferredLang);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return localCorrected;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/correct-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: rawSentence, language: preferredLang, userName }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.corrected && typeof data.corrected === 'string' && data.corrected.trim().length > 0) {
        return data.corrected.trim();
      }
    }
  } catch (err) {
    // Fall back to local rule-based corrector
  }

  return localCorrected;
}

