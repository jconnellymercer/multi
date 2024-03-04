(function () {
	// FA Settings ----------------------------- //
	window.wFORMS.behaviors.prefill.skip = false;
	window.wFORMS.behaviors.paging.runValidationOnPageNext = true;
	window.wFORMS.behaviors.paging.MESSAGES.CAPTION_NEXT = "Next";
	window.wFORMS.behaviors.paging.MESSAGES.CAPTION_PREVIOUS = "Previous";
	window.wFORMS.behaviors.paging.onPageChange = onPageChange;


	// Local ----------------------------- //
	let scrollY = window.scrollY;


	// Handlers ----------------------------- //
	document.addEventListener("DOMContentLoaded", function() {
		customizeCaptcha();
	});
	window.addEventListener("scroll", throttle(function() {
		// counteracts FA's behavior which scrolls window 
		// to the top of the current form page.
		scrollY = window.scrollY
	}, 100))


	// Methods ----------------------------- //

	function onPageChange($page) {
		window.scrollTo(0, scrollY);
	}

	function customizeCaptcha() {
		// Target captchaExplanation
		let captchaExplanation = document.querySelector("#disabled-explanation");
		// Check if the element exists
		if (captchaExplanation) {
			// Change the text of the element
			captchaExplanation.innerHTML =
			'The submit button will be disabled until you complete the CAPTCHA.<span style="color: red;">*</span>';
		}
	}

	function throttle(func, limit) {
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
	
})();
