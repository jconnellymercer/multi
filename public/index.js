(function () {

	class MercerForm {

		form = undefined
		
		constructor(target, setOptions) {
			this.el = target
			this.form = this.el.tagName !== 'FORM' ? this.el.querySelector('form') : this.el
			this.submitBtn = this.form.querySelector('[type="submit"]')
			
			if ( typeof setOptions === 'function' ) {
				setOptions()
			}
			
			this.customizeCaptcha();

			document.querySelectorAll('[data-mercer-dropdown]').forEach( el => new Dropdown(el) )
			
			this.form.addEventListener('submit', e => {
				this.form.classList.add('submitting');
				this.submitBtn.value = wFORMS.behaviors.validation.messages.wait
				this.submitBtn.disabled = true
			});
			
			window.wFORMS.behaviors.validation.onFail = () => {
				this.form.classList.remove('submitting');
				this.submitBtn.value = "Submit"
				this.submitBtn.disabled = false
			}
		}
	
		customizeCaptcha() {
			// Target captchaExplanation
			let captchaExplanation = document.querySelector("#disabled-explanation");
			// Check if the element exists
			if (captchaExplanation) {
				// Change the text of the element
				captchaExplanation.innerHTML =
				'The submit button will be disabled until you complete the CAPTCHA.<span style="color: red;">*</span>';
			}
		}

	}

	class MercerMultiPageForm extends MercerForm {

		constructor(target, setOptions) {
			super(target, setOptions)

			this.pageIndex = 0
			this.pageHeight = 0
			this.loading = true
			this.scrollY = window.scrollY
			this.pages = this.form.querySelectorAll('.wfPage, .wfCurrentPage')
			this.formProgress = new FormProgress(this.el.querySelector('.formProgress'), this.pages.length)

			window.wFORMS.behaviors.paging.onPageChange = (page) => this.onPageChange(page)
			window.wFORMS.behaviors.paging.onPagePrevious = (page) => this.onPagePrevious(page)

			window.addEventListener("scroll", Util.throttle(() => {
				// counteracts FA's behavior which scrolls window 
				// to the top of the current form page.
				this.scrollY = window.scrollY
			}, 30))

			setTimeout(() => {
				// allow time for layout shift
				this.moveLastPageButtons()
				this.initPages()
				this.loading = false
			}, 500)
		}

		moveLastPageButtons() {
			const lastPage = this.pages[this.pages.length - 1]
			const lastPageBtnContainer = this.form.querySelector('.last-page-previous-button')
			const clonedSubmit = this.submitBtn.cloneNode(true)
			this.submitBtn.style.display = 'none';
			this.submitBtn = clonedSubmit
			lastPageBtnContainer.appendChild(this.submitBtn)
			lastPage.appendChild(lastPageBtnContainer)
		}
		
		initPages() {
			let tallestPage
			if ( window.innerWidth > 1024 ) {
				tallestPage = this.pages.entries().reduce((maxHeight, page) => Math.max(maxHeight || 0, page[1].offsetHeight) )
			}
			this.pages.forEach( page => new Page(page, tallestPage) )
		}
		
		onPageChange(page) {
			window.scrollTo(0, this.scrollY);
			this.pageIndex = parseInt( page.id.split('').reverse()[0] )
			this.el.setAttribute('data-current-page', this.pageIndex)
			this.formProgress.setPage(this.pageIndex)
		}

		onPagePrevious(page) {
			this.submitBtn.disabled = true
		}
		
	}

	class Page {
		el = null
		dataValid = false
		requiredInputs = []
		nextButton = null
		errorColor = "#FF0000"
		errorSvg = `
			<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" clip-rule="evenodd"
					d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1.5-5.009c0-.867.659-1.491 1.491-1.491.85 0 1.509.624 1.509 1.491 0 .867-.659 1.509-1.509 1.509-.832 0-1.491-.642-1.491-1.509zM11.172 6a.5.5 0 0 0-.499.522l.306 7a.5.5 0 0 0 .5.478h1.043a.5.5 0 0 0 .5-.478l.305-7a.5.5 0 0 0-.5-.522h-1.655z"
					fill="${this.errorColor}" />
			</svg>
		`

		constructor(el, height) {
			this.el = el
			this.el.style.height = height ? `${height}px` : ''
			this.nextButton = this.el.querySelector('input.next') || this.el.querySelector('input[type="submit"]')

			// gather array of data about fields
			this.el.querySelectorAll('input[required]').forEach( input => {
				const { type, value } = input
				this.requiredInputs.push({
					el: input, type, value,
					autoformat: input.getAttribute("autoformat"),
				})
			} )

			// setup a proxy to watch property changes
			this.__proxy = new Proxy(this, {
				set(target, prop, val) {
					if ( prop === 'dataValid' ) {
						target.nextButton.disabled = ! val
					}
					return true
				}
			})

			// watch fields if there are required inputs
			if ( this.requiredInputs.length ) {
				this.__proxy.dataValid = false
				this.watchFields()
			}
		}

		watchFields() {

			// mask fields
			this.el.querySelectorAll('input[data-mask]').forEach(input => {
				const mask = input.getAttribute('data-mask')
				input.addEventListener("input", e => {
					if ( mask === 'phone' ) {
						e.target.value = this.maskPhoneNumber(e.target)
					}
					if ( mask === 'zip' ) {
						e.target.value = this.maskZip(e.target)
					}
					if ( mask === 'year' ) {
						e.target.value = this.maskYear(e.target)
					}
				})
			})

			this.requiredInputs.forEach( (input, i) => {

				input.el.addEventListener("blur", e => {
					if ( ! this.validate(input.value, input.el.getAttribute('data-pattern') ) ) {
						this.setError(input)
					} else {
						this.clearError(input)
					}
				})
				
				if ( input.type === 'tel' ) {
					const placeholder = input.el.placeholder
					input.el.addEventListener("focus", e => {
						input.el.placeholder = "###-###-####"
					})
					input.el.addEventListener("blur", e => {
						input.el.placeholder = placeholder
					})
				}

				input.el.addEventListener("input", e => {
					this.requiredInputs[i].value = e.target.value
					this.validateFields()
				})
			} )
		}

		validateFields() {
			const allFieldsValid = this.requiredInputs.reduce((isValid, input) => {
				if ( isValid === false ) {
					return isValid
				}
				return this.validate(input.value, input.el.getAttribute('data-pattern'))
			}, true)

			this.__proxy.dataValid = allFieldsValid

			if ( allFieldsValid ) {
				this.requiredInputs.forEach(input => this.clearError(input))
			}

			return allFieldsValid
		}

		validate(value, regex) {
			if ( ! regex ) {
				return value.length > 0
			}
			regex = new RegExp(regex);
			return regex.test(value)
		}

		maskPhoneNumber(input) {
			let val = input.value.replace(/\D/g, ''); // Remove non-digit characters
			if (val.length > 3) {
				val = val.substring(0, 3) + '-' + val.substring(3);
			}
			if (val.length > 7) {
				val = val.substring(0, 7) + '-' + val.substring(7);
			}
			return val.substring(0,12);
		}
		
		maskZip(input) {
			let val = input.value.replace(/\D/g, ''); // Remove non-digit characters
			return val.substring(0,5);
		}
		
		maskYear(input) {
			let val = input.value.replace(/\D/g, ''); // Remove non-digit characters
			return val.substring(0,4);
		}

		setError(input) {
			const svgWrapper = document.createElement('span')
			svgWrapper.classList.add('errorIcon')
			svgWrapper.innerHTML = this.errorSvg
			input.el.parentElement.classList.add('error')
			input.el.parentElement.appendChild(svgWrapper)
		} 

		clearError(input) {
			input.el.parentElement.classList.remove('error')
			const icon = input.el.parentElement.querySelector('.errorIcon')
			if ( icon ) {
				icon.remove()
			}
		}
	}

	// Form Progress ------------------------- //
	class FormProgress {
		constructor(el, pages) {
			this.el = el
			this.pages = pages
			this.stepNumber = this.el.querySelector('.formProgressPage')
			this.formProgressBarInner = this.el.querySelector('.formProgressBarInner')
		}

		setPage(page) {
			this.stepNumber.innerText = page
			this.formProgressBarInner.style.transform = `scaleX(${page/this.pages})`
		}
	}

	// Fields ------------------------------ //
	class Dropdown {
		select = null
		parent = null
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
			this.parent = el.parentElement
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
			this.label.innerHTML = text
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
			this.label = document.createElement("span")
			this.label.id = `${id}-label`
			this.label.classList.add('dropdown-label')
			this.label.innerHTML = title
			
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
			this.container.append(this.label, this.icon, this.input, this.optionsContainer)

			// Append the dropown
			this.parent.prepend(this.container)

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

	// Utilities ----------------------------- //
	const Util = {
		throttle: function(func, limit) {
			let inThrottle;
			return function() {
				const context = this;
				const args = arguments;
				if (!inThrottle) {
					func.apply(context, args);
					inThrottle = true;
					setTimeout(() => inThrottle = false, limit);
				}
			};
		}
	}
	
	// Init ----------------------------- //

	document.addEventListener("DOMContentLoaded", () => {

		faForm = document.querySelector('.mercerForm');
		window.mercerForm = new MercerMultiPageForm(faForm, () => {
			window.wFORMS.behaviors.paging.runValidationOnPageNext = true;
			window.wFORMS.behaviors.paging.MESSAGES.CAPTION_NEXT = "Next";
			window.wFORMS.behaviors.paging.MESSAGES.CAPTION_PREVIOUS = "Previous";
			window.wFORMS.behaviors.paging.CSS_CURRENT_PAGE = "current";
			window.wFORMS.behaviors.paging.CSS_BUTTON_NEXT = "next";
			window.wFORMS.behaviors.paging.CSS_BUTTON_PREVIOUS = "previous outline";
		})

	});

})();
