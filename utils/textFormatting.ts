/**
 * Utilities for formatting medical dictation text.
 * Handles command replacements (e.g., "new paragraph") and contraction expansion.
 */

export const formatDictationText = (text: string): string => {
  if (!text) return text;
  let formatted = text;

  // 1. Remove fillers (case insensitive)
  // \b matches word boundaries
  formatted = formatted.replace(/\b(um|uh|ah|like|you know|sort of)\b/gi, ' ');

  // 2. Expand Contractions (Medical formal style)
  const contractions: Record<string, string> = {
    "i'll": "I will",
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "hasn't": "has not",
    "haven't": "have not",
    "hadn't": "had not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "who's": "who is",
    "what's": "what is",
    "let's": "let us",
    "we're": "we are",
    "you're": "you are",
    "they're": "they are",
    "i'm": "I am",
    "we've": "we have",
    "you've": "you have",
    "they've": "they have",
  };

  for (const [key, value] of Object.entries(contractions)) {
    // Handle case insensitivity
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      // Preserve capitalization of first letter if original was capitalized
      if (match[0] && match[0] === match[0].toUpperCase()) {
         return value.charAt(0).toUpperCase() + value.slice(1);
      }
      return value;
    });
  }

  // 3. Formatting Commands
  // We use a map to define replacements. 
  // Note: Simple regex replacement can be aggressive (e.g. "period of time" -> ". of time").
  // However, for dictation workflow, these specific phrases are usually intended as commands.
  const commands: Record<string, string> = {
    'new paragraph': '\n\n',
    'next paragraph': '\n\n',
    'new line': '\n',
    'next line': '\n',
    'full stop': '.',
    'period': '.', 
    'comma': ',',
    'colon': ':',
    'semi-colon': ';',
    'semicolon': ';',
    'question mark': '?',
    'exclamation mark': '!',
    'open quote': '"',
    'close quote': '"',
    'open bracket': '[',
    'close bracket': ']',
    'open parenthesis': '(',
    'close parenthesis': ')',
  };

  for (const [cmd, replacement] of Object.entries(commands)) {
    const regex = new RegExp(`\\b${cmd}\\b`, 'gi');
    formatted = formatted.replace(regex, replacement);
  }

  // 4. Cleanup Punctuation Spacing
  // Remove space before punctuation: "word ." -> "word."
  formatted = formatted.replace(/\s+([.,:;?!])/g, '$1');
  // Ensure space after punctuation: "word.Next" -> "word. Next" (excluding if followed by newline or another punctuation)
  formatted = formatted.replace(/([.,:;?!])(?=[A-Za-z])/g, '$1 ');
  
  // 5. Cleanup Multiple Spaces
  formatted = formatted.replace(/[ \t]+/g, ' ');

  return formatted.trim();
};