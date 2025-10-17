 function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }

        // إظهار/إخفاء كلمة المرور
        function togglePasswordVisibility(inputId, button) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        }

        // إظهار تلميحات كلمة المرور
        function showPasswordHints() {
            document.getElementById('passwordHints').classList.add('show');
            document.getElementById('advancedStrength').classList.add('show');
        }

        function hidePasswordHints() {
            // تأخير إخفاء التلميحات لتمكين النقر على العناصر
            setTimeout(() => {
                document.getElementById('passwordHints').classList.remove('show');
                document.getElementById('advancedStrength').classList.remove('show');
            }, 300);
        }

        // التحقق من قوة كلمة المرور
        function checkPasswordStrength(password) {
            const strengthFill = document.getElementById('strengthFill');
            const strengthText = document.getElementById('strengthText');
            const strengthLevel = document.getElementById('strengthLevel');
            
            let strength = 0;
            const hints = {
                length: password.length >= 8,
                number: /\d/.test(password),
                upper: /[A-Z]/.test(password),
                lower: /[a-z]/.test(password),
                special: /[^a-zA-Z\d]/.test(password)
            };

            // تحديث التلميحات
            updateHints(hints);

            // حساب القوة
            if (hints.length) strength++;
            if (hints.number) strength++;
            if (hints.upper) strength++;
            if (hints.lower) strength++;
            if (hints.special) strength++;

            // تحديث الواجهة
            strengthFill.className = 'strength-fill changing';
            strengthLevel.style.display = 'inline-block';

            if (password.length === 0) {
                strengthFill.style.width = '0%';
                strengthText.textContent = 'لم يتم إدخال كلمة مرور';
                strengthLevel.style.display = 'none';
            } else if (strength <= 1) {
                strengthFill.className += ' very-weak';
                strengthText.textContent = 'ضعيف جداً';
                strengthLevel.textContent = 'ضعيف جداً';
                strengthLevel.className = 'strength-level very-weak';
                document.getElementById('signupPassword').className = 'password-field weak-password';
            } else if (strength <= 2) {
                strengthFill.className += ' weak';
                strengthText.textContent = 'ضعيف';
                strengthLevel.textContent = 'ضعيف';
                strengthLevel.className = 'strength-level weak';
                document.getElementById('signupPassword').className = 'password-field weak-password';
            } else if (strength === 3) {
                strengthFill.className += ' fair';
                strengthText.textContent = 'متوسط';
                strengthLevel.textContent = 'متوسط';
                strengthLevel.className = 'strength-level fair';
                document.getElementById('signupPassword').className = 'password-field';
            } else if (strength === 4) {
                strengthFill.className += ' strong';
                strengthText.textContent = 'قوي';
                strengthLevel.textContent = 'قوي';
                strengthLevel.className = 'strength-level strong';
                document.getElementById('signupPassword').className = 'password-field strong-password';
            } else {
                strengthFill.className += ' very-strong';
                strengthText.textContent = 'قوي جداً';
                strengthLevel.textContent = 'قوي جداً';
                strengthLevel.className = 'strength-level very-strong';
                document.getElementById('signupPassword').className = 'password-field strong-password';
            }

            // إزالة كلاس الأنيميشن بعد انتهائها
            setTimeout(() => {
                strengthFill.classList.remove('changing');
            }, 500);
        }

        // تحديث التلميحات والمؤشرات
        function updateHints(hints) {
            // تحديث التلميحات النصية
            document.getElementById('lengthHint').className = hints.length ? 'hint-item valid' : 'hint-item';
            document.getElementById('numberHint').className = hints.number ? 'hint-item valid' : 'hint-item';
            document.getElementById('upperHint').className = hints.upper ? 'hint-item valid' : 'hint-item';
            document.getElementById('lowerHint').className = hints.lower ? 'hint-item valid' : 'hint-item';
            document.getElementById('specialHint').className = hints.special ? 'hint-item valid' : 'hint-item';

            // تحديث المؤشرات المتقدمة
            document.getElementById('lengthCriteria').className = hints.length ? 'criteria-indicator met' : 'criteria-indicator';
            document.getElementById('numberCriteria').className = hints.number ? 'criteria-indicator met' : 'criteria-indicator';
            document.getElementById('upperCriteria').className = hints.upper ? 'criteria-indicator met' : 'criteria-indicator';
            document.getElementById('specialCriteria').className = hints.special ? 'criteria-indicator met' : 'criteria-indicator';
        }

        // التبديل بين النماذج
        function showSignupForm() {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
        }

        function showLoginForm() {
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        }

        // معالجة تسجيل الدخول
        function handleLogin(event) {
            event.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // محاكاة التحقق (في التطبيق الحقيقي سيكون اتصال مع الخادم)
            if (email && password) {
                showNotification('تم تسجيل الدخول بنجاح!', 'success');
                
                // محاكاة الانتقال للوحة التحكم بعد ثانيتين
                setTimeout(() => {
                    window.location.href = 'main.html'; // تغيير هذا لرابط لوحة التحكم الفعلي
                }, 2000);
            } else {
                showNotification('يرجى ملء جميع الحقول', 'error');
            }
        }

        // معالجة إنشاء الحساب
        function handleSignup(event) {
            event.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            // التحقق من صحة البيانات
            if (!name || !email || !password || !confirmPassword) {
                showNotification('يرجى ملء جميع الحقول', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('كلمتا المرور غير متطابقتين', 'error');
                return;
            }
            
            if (!agreeTerms) {
                showNotification('يجب الموافقة على الشروط والأحكام', 'error');
                return;
            }
            
            if (password.length < 8) {
                showNotification('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error');
                return;
            }
            
            // محاكاة إنشاء الحساب (في التطبيق الحقيقي سيكون اتصال مع الخادم)
            showNotification('تم إنشاء الحساب بنجاح!', 'success');
            
            // العودة لتسجيل الدخول بعد إنشاء الحساب
            setTimeout(() => {
                showLoginForm();
                // مسح الحقول
                document.getElementById('signupFormElement').reset();
                document.getElementById('strengthFill').style.width = '0%';
                document.getElementById('strengthText').textContent = 'لم يتم إدخال كلمة مرور';
                document.getElementById('strengthLevel').style.display = 'none';
            }, 2000);
        }

        // التحقق من صحة البريد الإلكتروني
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        // إضافة تحقق فوري للحقول
        document.addEventListener('DOMContentLoaded', function() {
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const confirmInput = document.getElementById('confirmPassword');
            
            emailInput.addEventListener('blur', function() {
                if (this.value && !isValidEmail(this.value)) {
                    this.style.borderColor = 'var(--danger)';
                } else {
                    this.style.borderColor = 'var(--border)';
                }
            });
            
            confirmInput.addEventListener('input', function() {
                const password = passwordInput.value;
                if (this.value && password !== this.value) {
                    this.style.borderColor = 'var(--danger)';
                } else {
                    this.style.borderColor = 'var(--border)';
                }
            });
        });