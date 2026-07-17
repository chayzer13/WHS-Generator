/**
 * Замена текста в Word XML, даже если он разбит на несколько w:r/w:t фрагментов.
 */
(function (global, factory) {
  'use strict';

  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.DocxReplacer = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function decodeXml(text) {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  function encodeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceTextOccurrences(text, searchStr, replaceStr) {
    if (!searchStr || searchStr === replaceStr) {
      return text;
    }

    const escaped = escapeRegExp(searchStr);
    const pattern = new RegExp(`(^|[^\\w])${escaped}(?=$|[^\\w])`, 'g');

    return text.replace(pattern, (match, prefix) => `${prefix}${replaceStr ?? ''}`);
  }

  function extractTextRuns(blockXml) {
    const runRegex = /(<w:r\b[^>]*>)([\s\S]*?)(<\/w:r>)/g;
    const runs = [];
    let match;

    while ((match = runRegex.exec(blockXml)) !== null) {
      const runContent = match[2];
      const textMatch = runContent.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/);
      if (textMatch) {
        runs.push({
          full: match[0],
          open: match[1],
          content: match[2],
          close: match[3],
          text: decodeXml(textMatch[1]),
        });
      }
    }

    return runs;
  }

  function setRunText(run, text) {
    const encoded = encodeXml(text);
    const newContent = run.content.replace(
      /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/,
      `<w:t xml:space="preserve">${encoded}</w:t>`
    );
    return run.open + newContent + run.close;
  }

  function replaceInBlock(blockXml, searchStr, replaceStr) {
    if (!searchStr || searchStr === replaceStr) {
      return blockXml;
    }

    const runs = extractTextRuns(blockXml);
    if (runs.length === 0) {
      return blockXml;
    }

    const fullText = runs.map((run) => run.text).join('');
    if (!fullText.includes(searchStr)) {
      return blockXml;
    }

    const updatedText = replaceTextOccurrences(fullText, searchStr, replaceStr ?? '');
    if (updatedText === fullText) {
      return blockXml;
    }

    const firstRun = runs[0];
    const firstRunUpdated = setRunText(firstRun, updatedText);

    let result = blockXml;
    const firstRunStart = result.indexOf(firstRun.full);
    if (firstRunStart === -1) {
      return blockXml;
    }

    result = result.slice(0, firstRunStart) + firstRunUpdated + result.slice(firstRunStart + firstRun.full.length);

    for (let i = 1; i < runs.length; i += 1) {
      const runSnippet = runs[i].full;
      const runStart = result.indexOf(runSnippet);
      if (runStart !== -1) {
        result = result.slice(0, runStart) + setRunText(runs[i], '') + result.slice(runStart + runSnippet.length);
      }
    }

    return result;
  }

  function replaceAllInBlock(blockXml, searchStr, replaceStr) {
    let result = blockXml;
    let safety = 0;

    while (safety < 20) {
      const next = replaceInBlock(result, searchStr, replaceStr);
      if (next === result) {
        break;
      }
      result = next;
      safety += 1;
    }

    return result;
  }

  function replaceInXml(xml, replacements) {
    const blockRegex = /(<w:(?:p|tc|txbxContent)\b[\s\S]*?<\/w:(?:p|tc|txbxContent)>)/g;

    return xml.replace(blockRegex, (block) => {
      let updated = block;
      for (const [from, to] of replacements) {
        if (from && from !== to) {
          updated = replaceAllInBlock(updated, from, to ?? '');
        }
      }
      return updated;
    });
  }

  function applyReplacementsToDocx(arrayBuffer, replacements) {
    const zip = new PizZip(arrayBuffer);
    const wordFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith('word/') && name.endsWith('.xml')
    );

    for (const fileName of wordFiles) {
      const file = zip.file(fileName);
      if (!file) {
        continue;
      }
      const xml = file.asText();
      const updated = replaceInXml(xml, replacements);
      zip.file(fileName, updated);
    }

    return zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  }

  return {
    applyReplacementsToDocx,
    replaceInXml,
  };
});
