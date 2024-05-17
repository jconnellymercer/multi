(function () {

  class MercerInput {
    constructor(input) {
      this.input = input
      this.oneField = this.input.closest(".oneField")

      this.input.addEventListener("focus", e => {
        this.oneField.classList.add("is-focused")
      })
      this.input.addEventListener("blur", e => {
        this.oneField.classList.remove("is-focused")
        if ( this.input.value === "" ) {
          this.oneField.classList.remove("has-value")
        } else {
          this.oneField.classList.add("has-value")
        }
      })
    }
  }

  class MercerDropdown {
		select = null
		inputWrapper = null
		container = null
		label = null
		icon = null
		input = null
		optionsContainer = null
		options = {}
		data = {
			open: false,
			activeOptionId: null
		}

		constructor(el) {
			this.select = el
			this.inputWrapper = el.closest(".inputWrapper")
      this.oneField = el.closest(".oneField")
			this.build()
			this.bindEvents()
			this.data = new Proxy(this.data, this.dataHandler())
		}

		dataHandler() {
			const __this = this
			return  {
				get: function(data, prop) {
					return data[prop];
				},
				set(data, prop, value) {
					
					if ( prop === 'open' ) {
						let isOpen = value
						if ( isOpen ) {
							__this.container.classList.add('open')
							if ( ! __this.data.activeOptionId ) {
								__this.data.activeOptionId = Object.keys(__this.options)[0]
							} else {
								__this.data.activeOptionId = Object.keys(__this.input.value)
							}
						} else {
							__this.container.classList.remove('open')
						}
					}
	
					if ( prop === 'activeOptionId' ) {
						let activeOptionId = value
						for ( let optionId in __this.options ) {
							if ( optionId === activeOptionId ) {
								__this.options[optionId].classList.add('active')
							} else {
								__this.options[optionId].classList.remove('active')
							}
						}
					}
					
					data[prop] = value
					return true
				}
			}
		}

		events = {
			document: {
				click: e => {
					if ( this.data.open && ! this.container.contains(e.target) ) {
						this.data.open = false
					}
				}
			},
			container: {
				blur: e => {
					this.data.open = false
				},
				click: e => {
					e.preventDefault()
					e.stopPropagation()
					this.data.open = !this.data.open
				},
				focus: e => {

				},
				keydown: e => {
					if ( e.code === 'ArrowUp' && this.data.open ) {
						let activeOptionIndex = Object.keys(this.options).indexOf(this.data.activeOptionId)
						let nextActiveIndex = Math.max(0, activeOptionIndex - 1)
						this.data.activeOptionId = Object.keys(this.options)[nextActiveIndex]
					}
					if ( e.code === 'ArrowDown' && this.data.open ) {
						let activeOptionIndex = Object.keys(this.options).indexOf(this.data.activeOptionId)
						let nextActiveIndex = Math.min(Object.keys(this.options).length - 1, activeOptionIndex + 1)
						this.data.activeOptionId = Object.keys(this.options)[nextActiveIndex]
					}
					if ( e.code === 'Enter' && this.data.open ) {
						e.preventDefault()
						e.stopPropagation()
						this.selectOption(this.options[this.data.activeOptionId])
						this.data.open = false
					}
					if ( e.code === 'Escape' ) {
						this.data.open = false
					}
					if ( e.code === 'Space' ) {
						this.data.open = !this.data.open
					}
				},
			},
			options: {
				click: e => { 
					e.preventDefault()
					e.stopPropagation()
					this.selectOption(e.target)
					this.data.open = false
				}
			}
		}

		bindEvents() {
			document.addEventListener('click', this.events.document.click)
			
			this.container.addEventListener("blur", this.events.container.blur)
			this.container.addEventListener('click', this.events.container.click)
			this.container.addEventListener("focus", this.events.container.focus)
			this.container.addEventListener("keydown", this.events.container.keydown)

			for (const optionId in this.options) {
				this.options[optionId].addEventListener('click', this.events.options.click)
			}

		}

		selectOption(option) {
			const value = option.getAttribute('data-value')
			const text = option.innerText
			this.input.value = value
			this.selection.innerHTML = text
      this.oneField.classList.add("has-value")
		}

		build() {
			const { id, name, title, required } = this.select
			
			// Container ------------ //
			this.container = document.createElement("div")
			this.container.id = `${id}-dropdown`
			this.container.className = "dropdown",
			this.container.role = "combobox",
			this.container.tabIndex = "0",
			this.container.setAttribute('aria-haspopup', "listbox"),
			this.container.setAttribute('aria-expanded', "false"),
			this.container.setAttribute('aria-labelledby', `${id}-label`),

			// Label ------------ //
			this.selection = document.createElement("span")
			this.selection.id = `${id}-selection`
			this.selection.classList.add('dropdown-selection')
			this.selection.innerHTML = title
			
			// Icon ------------ //
			this.icon = document.createElement("span")
			this.icon.classList.add('dropdown-icon')
			this.icon.innerHTML = `<svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.78711L8.5 9.93961L16 1.78711" stroke="#484747" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
			
			// hidden <input> to replace <select>  ------------ //
			this.input = document.createElement("input")
			this.input.id = id
			this.input.name = name
			this.input.type = "hidden"
			if ( required ) {
				this.input.required = required
				this.input.classList.add("required")
			}

			// Options -------------- //
			this.optionsContainer = document.createElement("div")
			this.optionsContainer.classList.add('dropdown-options')
			this.optionsContainer.setAttribute('aria-hidden', 'true')
			this.optionsContainer.role = 'listbox'
			this.options = {}

			for (let i = 0; i < this.select.options.length; i++) {
				const { id: optionId, value: optionValue, innerText } = this.select.options.item(i)
				this.options[optionId] = this.buildOption(optionValue, innerText)
			}
			for (const optionId in this.options) {
				this.optionsContainer.append(this.options[optionId])
			}
			
			// Append nodes --------------- //
			this.container.append(this.selection, this.icon, this.input, this.optionsContainer)

			// Append the dropown
			this.inputWrapper.prepend(this.container)

			// Remove Select --------------- //
			this.select.remove()
			
		}

		buildOption(value, text) {
			const optionDiv = document.createElement('div')
			optionDiv.classList.add('dropdown-option')
			optionDiv.role = 'option'
			optionDiv.setAttribute('aria-selected', 'false')
			optionDiv.setAttribute('data-value', value)
			optionDiv.innerText = text
			return optionDiv
		}
	}

  class MercerForm {
    constructor(target) {
      this.container = target;
      this.form = this.container.tagName !== "FORM" ? this.container.querySelector("form") : this.container;
      this.submitBtn = this.form.querySelector('[type="submit"]');

      // add autocomplete="off" to form
      this.form.autocomplete = "off"

      // Init behavior on inputs
      this.form.querySelectorAll(".oneField .inputWrapper input, .oneField .inputWrapper textarea").forEach( input => {
        new MercerInput(input)
      } )

      // Init Dropdowns
      this.form.querySelectorAll('.oneField .inputWrapper select').forEach( select => new MercerDropdown(select) )
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const interval = setInterval(() => {
      if ( wFORMS.initialized ) {
        new MercerForm( document.querySelector(".wFormContainer") )
        clearInterval(interval)
      }
    }, 100)
  });

})();
