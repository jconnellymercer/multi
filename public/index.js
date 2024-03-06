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

			this.page = 0
			this.loading = true
			this.scrollY = window.scrollY
			this.pages = this.form.querySelectorAll('.wfPage, .wfCurrentPage')
			this.formProgress = new FormProgress(this.el.querySelector('.formProgress'), this.pages.length)

			window.wFORMS.behaviors.paging.onPageChange = (page) => this.onPageChange(page)
			window.wFORMS.behaviors.paging.onPagePrevious = (page) => this.onPagePrevious(page)
			window.wFORMS.behaviors.paging.onPageNext = (page) => this.onPageNext(page)

			window.addEventListener("scroll", Util.throttle(() => {
				// counteracts FA's behavior which scrolls window 
				// to the top of the current form page.
				this.scrollY = window.scrollY
			}, 30))

			setTimeout(() => {
				// allow time for layout shift
				this.setPageHeight()
				this.loading = false;
			}, 1000)
		}
		
		setPageHeight() {
			let maxHeight = 0
			this.pages.forEach( page => maxHeight = Math.max(maxHeight, page.offsetHeight ) )
			this.pages.forEach( page => page.style.height = `${maxHeight}px` )
		}
		
		onPageChange(page) {
			window.scrollTo(0, this.scrollY);
			this.page = parseInt( page.id.split('').reverse()[0] )
			this.formProgress.set(this.page)
		}

		onPagePrevious(page) {
			// this.page = this.page - 1
		}
		
		onPageNext(page) {
			// this.page = this.page + 1
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

		set(page) {
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
