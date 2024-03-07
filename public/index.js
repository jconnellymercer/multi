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
				input.el.addEventListener("input", e => {
					this.requiredInputs[i].value = e.target.value
				})
			} )

			console.log(this.requiredInputs);
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
