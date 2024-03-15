(function () {

	class MercerForm {

		form = undefined
		
		constructor(target, setOptions) {
			this.el = target
			this.form = this.el.tagName !== 'FORM' ? this.el.querySelector('form') : this.el
			if ( typeof setOptions === 'function' ) {
				setOptions()
			}
			this.customizeCaptcha();
			document.querySelectorAll('[data-mercer-dropdown]').forEach( el => new Dropdown(el) )
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
			this.submitBtn = this.form.querySelector('[type="submit"]')
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
			lastPageBtnContainer.appendChild(this.submitBtn)
			lastPage.appendChild(lastPageBtnContainer)
		}
		
		initPages() {
			let tallestPage
			if ( window.innerWidth > 767 ) {
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
				const { pattern, type, value } = input
				this.requiredInputs.push({
					el: input, pattern, type, value,
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
			this.requiredInputs.forEach( (input, i) => {

				input.el.addEventListener("blur", e => {
					if ( ! this.validateInput(input) ) {
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
					if ( input.type === 'tel' ) {
						e.target.value = this.maskPhoneNumber(e.target)
					}
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
				return this.validateInput(input)
			}, true)

			this.__proxy.dataValid = allFieldsValid

			if ( allFieldsValid ) {
				this.requiredInputs.forEach(input => this.clearError(input))
			}

			return allFieldsValid
		}

		validateInput(input) {
			switch (input.type) {
				case "email": {
					return this.validateEmail(input.value)
				}
				case "tel": {
					return this.validateTelephone(input.value)
				}
				default: {
					return input.value.length > 0
				}
			}
		}

		validateTelephone(value) {
			const telRegEx = /^\d{3}-\d{3}-\d{4}$/g
			return telRegEx.test(value)
		}

		validateEmail(value) {
			const emailRegEx = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/g
			return emailRegEx.test(value)
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
		open = false

		constructor(el) {
			this.select = el
			this.parent = el.parentElement
			this.build()
			this.bindEvents()
		}

		toggleOpen(val) {
			if ( val === undefined ) {
				this.container.classList.toggle('open')
			} else if ( val === true ) {
				this.container.classList.add('open')
			} else {
				this.container.classList.remove('open')
			}
		}

		bindEvents() {
			document.addEventListener('click', e => {
				this.toggleOpen(false)
			})
			this.container.addEventListener('click', e => {
				e.preventDefault()
				e.stopPropagation()
				this.toggleOpen()
			})
			for (const optionId in this.options) {
				this.options[optionId].addEventListener('click', e => { 
					e.preventDefault(); 
					this.handleOptionSelect(e.target) 
				})
			}
		}

		handleOptionSelect(option) {
			const value = option.getAttribute('data-value')
			const text = option.innerText
			this.input.value = value
			this.label.innerHTML = text
		}

		build() {
			const { id, name, value, title } = this.select
			
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
			this.input.value = value
			this.input.type = "hidden"

			// Options -------------- //
			this.optionsContainer = document.createElement("div")
			this.optionsContainer.classList.add('dropdown-options')
			this.optionsContainer.setAttribute('aria-hidden', 'true')
			this.optionsContainer.tabIndex = '-1'
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
			const html = document.createElement('div')
			html.classList.add('dropdown-option')
			html.role = 'option'
			html.setAttribute('aria-selected', 'false')
			html.setAttribute('data-value', value)
			html.innerText = text
			return html
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
