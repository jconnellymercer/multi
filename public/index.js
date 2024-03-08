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
			const submitBtn = this.form.querySelector('[type="submit"]')
			lastPageBtnContainer.appendChild(submitBtn)
			lastPage.appendChild(lastPageBtnContainer)
		}
		
		initPages() {
			const maxHeight = this.pages.entries().reduce((maxHeight, page) => Math.max(maxHeight || 0, page[1].offsetHeight) )
			this.pages.forEach( page => new Page(page, maxHeight) )
		}
		
		onPageChange(page) {
			window.scrollTo(0, this.scrollY);
			this.pageIndex = parseInt( page.id.split('').reverse()[0] )
			this.formProgress.setPage(this.pageIndex)
		}
		
	}

	class Page {
		constructor(el, height) {
			this.el = el
			this.el.style.height = `${height}px` 
			
			this.requiredInputs = []
			this.el.querySelectorAll('input[required]').forEach( input => {
				const { pattern, type, value } = input
				this.requiredInputs.push({
					el: input, pattern, type, value,
					autoformat: input.getAttribute("autoformat"),
				})
			} )

			if ( this.requiredInputs.length ) {
				this.watchFields()
			}
		}

		watchFields() {
			this.requiredInputs.forEach( (input, i) => {
				
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
						let val = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
						if (val.length > 3) {
							val = val.substring(0, 3) + '-' + val.substring(3);
						}
						if (val.length > 7) {
							val = val.substring(0, 7) + '-' + val.substring(7);
						}
						e.target.value = val.substring(0,12);
					}
					this.requiredInputs[i].value = e.target.value
					console.log( this.validateFields() );
				})
			} )
		}

		validateFields() {
			return this.requiredInputs.reduce((isValid, input) => {
				if ( isValid === false ) 
					return isValid
				
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
			}, true)
		}

		validateTelephone(value) {
			const telRegEx = /^\d{3}-\d{3}-\d{4}$/g
			return telRegEx.test(value)
		}

		validateEmail(value) {
			const emailRegEx = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/g
			return emailRegEx.test(value)
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
			window.wFORMS.behaviors.prefill.skip = false;
			window.wFORMS.behaviors.paging.runValidationOnPageNext = true;
			window.wFORMS.behaviors.paging.MESSAGES.CAPTION_NEXT = "Next";
			window.wFORMS.behaviors.paging.MESSAGES.CAPTION_PREVIOUS = "Previous";
			window.wFORMS.behaviors.paging.CSS_CURRENT_PAGE = "current";
			window.wFORMS.behaviors.paging.CSS_BUTTON_NEXT = "next";
			window.wFORMS.behaviors.paging.CSS_BUTTON_PREVIOUS = "previous outline";
		})

	});

})();
