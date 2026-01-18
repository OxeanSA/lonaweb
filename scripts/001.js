function Signup(form, el) {
  // Multi-step logic: only validate and advance one step at a time
  const steps = Array.from(form.querySelectorAll('.signup-step'));
  const currentStepIdx = steps.findIndex(step => step.classList.contains('active'));
  const currentStep = steps[currentStepIdx];

  // Find the input in the current step
  const field = currentStep.querySelector('.field');
  const input = field.querySelector('input');
  const nextBtn = currentStep.querySelector('.next-step');
  const submitBtn = currentStep.querySelector('[type="submit"]');

  // Validation for each step
  let valid = false;
  if (input) {
    if (input.name === "firstname") {
      valid = validateSingleField(input, field, "First name can't be blank");
    } else if (input.name === "lastname") {
      valid = validateSingleField(input, field, "Last name can't be blank");
    } else if (input.name === "email") {
      valid = validateSingleField(input, field, "Email can't be blank", /^[^ ]+@[^ ]+\.[a-z]{2,3}$/);
    } else if (input.name === "password") {
      valid = validateSingleField(input, field, "Password can't be blank");
    }
  }

  // Allow pressing Enter to go to next step or submit
  if (input) {
    input.onkeydown = function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (nextBtn && !submitBtn) nextBtn.click();
        if (submitBtn) submitBtn.click();
      }
    };
  }

  // If not last step, advance to next step on Next button click
  if (nextBtn && !submitBtn) {
    nextBtn.onclick = function () {
      if (valid) {
        steps[currentStepIdx].classList.remove('active');
        steps[currentStepIdx + 1].classList.add('active');
        // Update progress dots
        document.querySelectorAll('.signup-progress .dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === currentStepIdx + 1);
        });
        // Focus next input for better UX
        const nextInput = steps[currentStepIdx + 1].querySelector('input');
        if (nextInput) nextInput.focus();
      } else {
        field.classList.add("shake");
        setTimeout(() => field.classList.remove("shake"), 500);
      }
    };
    // Prevent form submit on Next
    return false;
  }

  // On submit (last step), validate all fields before sending
  if (submitBtn) {
    // Gather all fields for validation
    const eField = form.querySelector(".email");
    const eInput = eField.querySelector("input");
    const fnField = form.querySelector(".fname");
    const fnInput = fnField.querySelector("input");
    const lnField = form.querySelector(".lname");
    const lnInput = lnField.querySelector("input");
    const pField = form.querySelector(".password");
    const pInput = pField.querySelector("input");

    let allValid = true;
    allValid &= validateSingleField(fnInput, fnField, "First name can't be blank");
    allValid &= validateSingleField(lnInput, lnField, "Last name can't be blank");
    allValid &= validateSingleField(eInput, eField, "Email can't be blank", /^[^ ]+@[^ ]+\.[a-z]{2,3}$/);
    allValid &= validateSingleField(pInput, pField, "Password can't be blank");

    if (!allValid) {
      [fnField, lnField, eField, pField].forEach(f => {
        if (f.classList.contains("error")) {
          f.classList.add("shake");
          setTimeout(() => f.classList.remove("shake"), 500);
        }
      });
      return false;
    }

    el.classList.add("active");
    el.disabled = true;
    el.querySelector('.text').textContent = "Signing up...";
    fetchData("/account/signup", "POST", {
      email: eInput.value,
      firstname: fnInput.value,
      lastname: lnInput.value,
      password: pInput.value
    }, "no-cache")
      .then(response => response.json())
      .then(data => {
        el.disabled = false;
        el.classList.remove("active");
        el.querySelector('.text').textContent = "SIGN UP";
        if (data.status === "ok") {
          setItem("LOGGEDIN", "true");
          setItem("user_id", data.user_id);
          setItem("access_token", data.access_token);
          setItem("refresh_token", data.refresh_token);
          AUi(true);
        } else {
          // Show error on email field for any signup error
          toggleError(eField, true, data.message || "Signup failed");
          eField.classList.add("shake");
        }
      });
    return false;
  }
}

function Login(form, el) {
  const eField = form.querySelector(".email");
  const eInput = eField.querySelector("input");
  const pField = form.querySelector(".password");
  const pInput = pField.querySelector("input");

  let valid = true;
  valid &= validateSingleField(eInput, eField, "Field can't be blank", /^[^ ]+@[^ ]+\.[a-z]{2,3}$/);
  valid &= validateSingleField(pInput, pField, "Field can't be blank");

  // Allow pressing Enter to submit
  [eInput, pInput].forEach(inp => {
    inp.onkeydown = function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        el.click();
      }
    };
  });

  if (!valid) {
    [eField, pField].forEach(f => {
      if (f.classList.contains("error")) {
        f.classList.add("shake");
        setTimeout(() => f.classList.remove("shake"), 500);
      }
    });
    return false;
  }

  el.classList.add("active");
  el.disabled = true;
  el.querySelector('.text').textContent = "Logging in...";
  fetchData("/account/login", "POST", {
    email: eInput.value,
    password: pInput.value
  }, "no-cache")
    .then(response => response.json())
    .then(data => {
      el.disabled = false;
      el.classList.remove("active");
      if (data.status === "ok") {
        el.querySelector('.text').innerHTML = "<i class='fa fa-check'></i>";
        setItem("LOGGEDIN", "true");
        setItem("user_id", data.user_id);
        setItem("access_token", data.access_token);
        setItem("refresh_token", data.refresh_token);
        setItem("user_data", {"first_name": data.first_name, "last_name": data.last_name, "username": data.username });
        bodyData.user_id = data.user_id;
        AUi(true);
      } else if (data.status === "password_invalid") {
        el.querySelector('.text').textContent = "LOGIN";
        toggleError(pField, true, "Wrong password");
        pField.classList.add("shake");
      } else if (data.status === "email_invalid") {
        el.querySelector('.text').textContent = "LOGIN";
        toggleError(eField, true, "Email not found");
        eField.classList.add("shake");
      } else {
        el.querySelector('.text').textContent = "LOGIN";
        toggleError(pField, true, "Login failed");
        pField.classList.add("shake");
      }
    });
  return false;
}

// Utility: validate a single field, with optional regex
function validateSingleField(input, field, blankMsg, pattern) {
  let valid = true;
  if (!input.value) {
    toggleError(field, true, blankMsg);
    valid = false;
  } else if (pattern && !input.value.match(pattern)) {
    toggleError(field, true, "Enter a valid value");
    valid = false;
  } else {
    toggleError(field, false, "");
  }
  return valid;
}

function toggleError(field, hasError, errorMessage) {
  const errorTxt = field.querySelector(".error-txt");
  if (hasError) {
    field.classList.add("error");
    field.classList.remove("valid");
    if (errorTxt) errorTxt.innerText = errorMessage;
  } else {
    field.classList.remove("error");
    field.classList.add("valid");
    if (errorTxt) errorTxt.innerText = "";
  }
}

function nextSignupStep(step) {
  document.querySelectorAll('.signup-step').forEach((el, idx) => {
    el.classList.toggle('active', idx === step - 1);
    document.querySelectorAll('.signup-progress .dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === step - 1);
    });
  });
}

function removeShake(fields) {
  fields.forEach((field) => field.classList.remove("shake"));
}

function isValid(fields) {
  return fields.every((field) => !field.classList.contains("error"));
}
function showTab(tab) {
  document.querySelectorAll('.auth-tab-content').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if(tab === 'login') {
    document.querySelector('.loginform').classList.add('active');
    document.getElementById('loginTabBtn').classList.add('active');
  } else {
    document.querySelector('.signupform').classList.add('active');
    document.getElementById('signupTabBtn').classList.add('active');
  }
}
function nextSignupStep(step) {
  document.querySelectorAll('.signup-step').forEach((el, idx) => {
    el.classList.toggle('active', idx === step - 1);
    document.querySelectorAll('.signup-progress .dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === step - 1);
    });
  });
}
function togglePassword(el) {
  const input = el.parentElement.querySelector('input');
  if (input.type === "password") {
    input.type = "text";
    el.querySelector('i').classList.remove('fa-eye');
    el.querySelector('i').classList.add('fa-eye-slash');
  } else {
    input.type = "password";
    el.querySelector('i').classList.remove('fa-eye-slash');
    el.querySelector('i').classList.add('fa-eye');
  }
}

