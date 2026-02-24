function detectLanguage(text) {
    if (!text) return 'de';
    
    const germanWords = [
        'der', 'die', 'das', 'ist', 'und', 'zu', 'mit', 'für', 'von', 'ich',
        'sie', 'du', 'wir', 'was', 'wie', 'bitte', 'danke', 'preis',
        'verkaufen', 'kaufen', 'gerne', 'möchte', 'haben', 'sein', 'noch',
        'ja', 'nein', 'hallo', 'guten', 'tag', 'abend'
    ];
    
    const englishWords = [
        'the', 'is', 'and', 'to', 'for', 'of', 'you', 'me', 'what', 'how',
        'please', 'thank', 'price', 'sell', 'buy', 'would', 'like', 'have',
        'be', 'still', 'yes', 'no', 'hi', 'hello', 'good', 'day'
    ];
    
    const lowerText = text.toLowerCase();
    const wordBoundary = (w) => {
        return lowerText.includes(` ${w} `) ||
               lowerText.startsWith(`${w} `) ||
               lowerText.endsWith(` ${w}`) ||
               lowerText === w;
    };
    
    const gScore = germanWords.filter(wordBoundary).length;
    const eScore = englishWords.filter(wordBoundary).length;
    
    if (gScore > eScore) return 'de';
    if (eScore > gScore) return 'en';
    return 'de';
}

module.exports = { detectLanguage };
