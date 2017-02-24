Backed(class CustomMarked extends HTMLElement {
  static get properties() {
    return {
      /**
       * The source that should be converted into markdown
       */
       src: {
         observer: 'unindent',
         value: null
       },
      /**
       * The markdown source that should be rendered by this element.
       */
      markdown: {
        observer: 'render',
        type: String,
        value: null
      },

      /**
       * True when marked is ready.
       */
      markedReady: {
        observer: 'render',
        type: Boolean,
        value: null
      },

      /**
       * Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior.
       */
      pedantic: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Function used to customize a renderer based on the [API specified in the Marked
       * library](https://github.com/chjj/marked#overriding-renderer-methods).
       * It takes one argument: a marked renderer object, which is mutated by the function.
       */
      renderer: {
        observer: 'render',
        type: Function,
        value: null
      },
      /**
       * Sanitize the output. Ignore any HTML that has been input.
       */
      sanitize: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Use "smart" typographic punctuation for things like quotes and dashes.
       */
      smartypants: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Callback function invoked by Marked after HTML has been rendered.
       * It must take two arguments: err and text and must return the resulting text.
       */
      callback: {
        observer: 'render',
        type: Function,
        value: null
      }
    }
  }
  static get observers() {

  }
  constructor() {
    super();
    this._highlight = this._highlight.bind(this)
  }

  connectedCallback() {
    const promises = [
      this.loadScript('../bower_components/prism/prism.js'),
      this.loadScript('../bower_components/marked/marked.min.js')
    ]
    Promise.all(promises).then(() => {
      this.markedReady = true;
      this.src = this.getAttribute('src');
    });
  }

  render(change) {
    console.log(change);
    if (this.markedReady && this.markdown) {
      let renderer = new marked.Renderer();
      if (this.renderer) {
        this.renderer(renderer);
      }
      let opts = {
        renderer: renderer,
        highlight: this._highlight.bind(this),
        sanitize: this.sanitize,
        pedantic: this.pedantic,
        smartypants: this.smartypants
      };
      let snippet = this.markdown;
      snippet = snippet.replace(/=""/g, '');
      this._markdown = '```\n' + snippet + '\n' + '```';
      this.innerHTML = marked(this._markdown, opts, this.callback);
    }
  }

  _highlight(code, lang) {
    let event = this.fireEvent('syntax-highlight', {code: code, lang: lang});
    return Prism.highlight(code, this._detectLang(code, lang));
  }

  unindent(change) {
    if (change.value) {
      this.markdown = this._unindent(change.value);
    }
  }

  _unindent(text) {
     if (!text) return text;
     let lines  = text.replace(/\t/g, '  ').split('\n');
     let indent = lines.reduce((prev, line) => {
       if (/^\s*$/.test(line)) return prev;  // Completely ignore blank lines.
       let lineIndent = line.match(/^(\s*)/)[0].length;
       if (prev === null) return lineIndent;
       return lineIndent < prev ? lineIndent : prev;
     }, null);
     return lines.map((l) => { return l.substr(indent); }).join('\n');
   }

   /**
    * Picks a Prism formatter based on the `lang` hint and `code`.
    *
    * @param {string} code The source being highlighted.
    * @param {string=} lang A language hint (e.g. ````LANG`).
    * @return {!prism.Lang}
    */
   _detectLang(code, lang) {
     if (!lang) {
       // Stupid simple detection if we have no lang, courtesy of:
       // https://github.com/robdodson/mark-down/blob/ac2eaa/mark-down.html#L93-101
       return code.match(/^\s*</) ? Prism.languages.markup : Prism.languages.javascript;
     }
     if (this.languages[lang]) {
       return this.languages[lang];
     } else if (Prism.languages[lang]) {
       return Prism.languages[lang];
     }
     switch (lang.substr(0, 2)) {
       case 'js':
       case 'es':
         return Prism.languages.javascript;
       case 'c':
         return Prism.languages.clike;
       default:
         // The assumption is that you're mostly documenting HTML when in HTML.
         return Prism.languages.markup;
     }
   }

});
