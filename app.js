const base64Auth = 'UlJDVEFQSV9BRE1JTjpSUkNUQFAhUEBzcw==';
// const APIUrl='https://api.rrcharitabletrust.org/api';
//const APIUrl='https://localhost:44362/api';
const APIUrl = 'https://rrcharitabletrust.bsite.net/api';
new Vue({
    el: '#app',
    data: {
        survey: {
            Name: '',
            RegionalName: '',
            Address: '',
            RegionalAddress: '',
            URBNo: '',
            MobileNumber: '',
            VRM_Id: '',
            Age: '',
            Gender: 'Male',
            Email:'',
            Members: [],
            translationStatus: {
                Name: null,
                Address: null
            }
        },
        urbNoError: '',
        mobileNoError: '',
        showConfirmation: false,
        urbNoChecking: false,
        validURBNo: false,
        submissionError: null,
        showModal: false,
        responseData: {
            Success: false,
            Message: '',
            Results: [],
            VrmTotalMembers: 0
        },
        isSubmitting: false
    },
    methods: {
        async translateField(type, indexOrModel, sourceField, targetField) {
            let context, englishText;
            console.log(`Translating: ${sourceField}:${targetField}`); // Debug log
            try {
                if (type === 'survey') {
                    context = this.survey;
                    englishText = context[sourceField];
                } else {
                    context = this.survey.Members[indexOrModel];
                    englishText = context[sourceField];
                    
                    // Initialize translationStatus for member if it doesn't exist
                    if (!context.translationStatus) {
                        this.$set(context, 'translationStatus', {});
                    }
                }
                console.log(`Translating: ${englishText}`); // Debug log
                if (!englishText || !englishText.trim()) {
                    context[targetField] = '';
                    this.updateTranslationStatus(context, sourceField, null);
                    return;
                }

                // Call the translation function from hindiTranslator.js
                console.log(`Translating: ${englishText}`); // Debug log
                const hindiText = await getHindiTextAsync(englishText);
                console.log(`Translated: ${hindiText}`); // Debug log
                if (hindiText) {
                    context[targetField] = hindiText;
                    this.updateTranslationStatus(context, sourceField, {
                        type: 'success',
                        message: 'Auto-translated'
                    });
                } else {
                    this.updateTranslationStatus(context, sourceField, {
                        type: 'error',
                        message: 'Translation failed'
                    });
                }
            } catch (error) {
                console.error('Translation error:', error);
                this.updateTranslationStatus(context, sourceField, {
                    type: 'error',
                    message: 'Translation failed'
                });
            }
        },

        updateTranslationStatus(context, field, status) {
            if (context === this.survey) {
                this.$set(context.translationStatus, field, status);
            } else {
                if (!context.translationStatus) {
                    this.$set(context, 'translationStatus', {});
                }
                this.$set(context.translationStatus, field, status);
            }
            
            // Clear status after 3 seconds if it exists
            if (status) {
                setTimeout(() => {
                    if (context.translationStatus && context.translationStatus[field]) {
                        this.$set(context.translationStatus, field, null);
                    }
                }, 3000);
            }
        },

        validateURBNo(urbNo) {
            if (!urbNo) {
                return "URB No is required";
            }
            if (!urbNo.match(/^[A-Za-z0-9]+$/)) {
                return "URB No should be alphanumeric";
            }
            return "";
        },

        validateFamilyURBNo() {
            this.urbNoError = this.validateURBNo(this.survey.URBNo);
            if (!this.urbNoError) {
                this.checkURBNoExist();
            }
        },

        validateMemberURBNo(index) {
            const member = this.survey.Members[index];
            const error = this.validateURBNo(member.URBNo);
            Vue.set(member, 'urbNoError', error);
            
            if (!error && member.URBNo) {
                this.checkMemberURBNoExist(index);
            }
        },

        async checkURBNoExist() {
            this.urbNoError = '';
            this.validURBNo = false;
            this.urbNoChecking = true;
            
            try {
                const response = await axios.get(
                    `${APIUrl}/URB/CheckURBNoExist?urbNo=${encodeURIComponent(this.survey.URBNo)}`, 
                    { 
                        headers: {
                        'Authorization': `Basic ${base64Auth}`
                        } 
                    }
                );
                
                if (response.data.exists) {
                    this.urbNoError = "This URB No already exists";
                    this.survey.URBNo = '';
                } else {
                    this.validURBNo = true;
                }
            } catch (error) {
                if (error.response?.status === 400) {
                    this.urbNoError = "Invalid URB No format";
                } else {
                    console.error("Error checking URB No:", error);
                    this.urbNoError = "Error validating URB No. Please try again.";
                }
            } finally {
                this.urbNoChecking = false;
            }
        },

        async checkMemberURBNoExist(index) {
            const member = this.survey.Members[index];
            if (!member.URBNo) return;

            Vue.set(member, 'urbNoChecking', true);
            try {
                const response = await axios.get(
                    `${APIUrl}/URB/CheckURBNoExist?urbNo=${encodeURIComponent(member.URBNo)}`, 
                    { 
                        headers: {
                        'Authorization': `Basic ${base64Auth}`
                        } 
                    }
                );
                
                if (response.data.exists) {
                    Vue.set(member, 'urbNoError', "This URB No already exists");
                    member.URBNo = '';
                }
            } catch (error) {
                Vue.set(member, 'urbNoError', "Error validating URB No");
            } finally {
                Vue.set(member, 'urbNoChecking', false);
            }
        },

        validateMobileNo() {
            if (!this.survey.MobileNumber.match(/^[0-9]{10}$/)) {
                this.mobileNoError = "Please enter a valid 10-digit mobile number";
            } else {
                this.mobileNoError = "";
            }
        },

        validateMemberMobileNo(index) {
            const member = this.survey.Members[index];
            if (member.MobileNo && !member.MobileNo.match(/^[0-9]{10}$/)) {
                Vue.set(member, 'mobileNoError', "Please enter a valid 10-digit mobile number");
            } else {
                Vue.set(member, 'mobileNoError', "");
            }
        },

        addMember() {
            if (!this.validURBNo) {
                this.urbNoError = "Please validate family URB No first";
                return;
            }
            
            if (this.survey.Members.length >= 5) return;

            const newMember = {
                SrNo: this.survey.Members.length + 1,
                Name: '',
                RegionalName: '',
                Age: 0,
                Gender: 'Male',
                MobileNo: '',
                URBNo: '',
                urbNoError: '',
                urbNoChecking: false,
                mobileNoError: '',
                translationStatus: null
            };
            this.survey.Members.push(newMember);
            
            this.$nextTick(() => {
                const members = this.$el.querySelectorAll('.member-card');
                members[members.length - 1].scrollIntoView({ behavior: 'smooth' });
            });
        },

        animateRemove(index) {
            const memberElement = this.$el.querySelectorAll('.member-card')[index];
            memberElement.classList.add('animate__animated', 'animate__zoomOut');
            
            setTimeout(() => {
                this.survey.Members.splice(index, 1);
                this.survey.Members.forEach((member, i) => {
                    member.SrNo = i + 1;
                });
            }, 300);
        },

        async submitForm() {
            if (this.isSubmitting) return;
            this.isSubmitting = true;
            this.submissionError = null;
            
            // Validate family URB No
            this.urbNoError = this.validateURBNo(this.survey.URBNo);
            if (this.urbNoError) {
                this.isSubmitting = false;
                return;
            }
            
            // Validate member URB Nos
            let hasErrors = false;
            this.survey.Members.forEach((member, index) => {
                const error = this.validateURBNo(member.URBNo);
                if (error) {
                    Vue.set(member, 'urbNoError', error);
                    hasErrors = true;
                }
            });
            
            if (hasErrors) {
                this.isSubmitting = false;
                return;
            }
            
            // Validate family mobile number
            if (!this.survey.MobileNumber.match(/^[0-9]{10}$/)) {
                this.mobileNoError = "Please enter a valid 10-digit mobile number";
                this.isSubmitting = false;
                return;
            }

            // Validate member mobile numbers
            for (const member of this.survey.Members) {
                if (member.MobileNo && !member.MobileNo.match(/^[0-9]{10}$/)) {
                    Vue.set(member, 'mobileNoError', "Please enter a valid 10-digit mobile number");
                    hasErrors = true;
                }
            }
            
            if (hasErrors) {
                this.isSubmitting = false;
                return;
            }
            
            try {
                // Create the primary member from family information
                const primaryMember = {
                    SrNo: 1,
                    Name: this.survey.Name,
                    RegionalName: this.survey.RegionalName,
                    Age: this.survey.Age,
                    Gender: this.survey.Gender,
                    MobileNo: this.survey.MobileNumber,
                    URBNo: this.survey.URBNo,
                    IsPrimary: true
                };
                
                // Combine primary member with additional members
                const allMembers = [primaryMember, ...this.survey.Members.map((m, i) => ({
                    SrNo: i + 2,
                    Name: m.Name,
                    RegionalName: m.RegionalName,
                    Age: m.Age,
                    Gender: m.Gender,
                    MobileNo: m.MobileNo,
                    URBNo: m.URBNo,
                    IsPrimary: false
                }))];
                const isNumeric = /^\d+$/.test(this.survey.VRM_Id.trim());
                const payload = {
                    Name: this.survey.Name,
                    RegionalName: this.survey.RegionalName,
                    Address: this.survey.Address,
                    RegionalAddress: this.survey.RegionalAddress,
                    URBNo: this.survey.URBNo,
                    MobileNumber: this.survey.MobileNumber,
                    VRM_Id: isNumeric ? this.survey.VRM_Id.trim() : null,
                    VRM_Name: isNumeric ? null : this.survey.VRM_Id.trim(),
                    Email:this.survey.Email,
                    Members: allMembers
                };
                
                const response = await axios.post(
                    `${APIUrl}/Survey/SaveSurvey`,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Basic ${base64Auth}`
                        }
                    }
                );
                
                // Store the response data
                this.responseData = response.data;
                
                // Show the modal with response data
                this.showModal = true;
                this.showConfirmation = true;
            } catch (error) {
                console.error('Submission error:', error);
                this.submissionError = error.response?.data?.Message || "Failed to submit survey";
                
                // Set error response data
                this.responseData = {
                    Success: false,
                    Message: this.submissionError,
                    Results: [],
                    VrmTotalMembers: 0
                };
                
                // Show the modal with error
                this.showModal = true;
            } finally {
                this.isSubmitting = false;
            }
        },

        closeModal() {
            this.showModal = false;
        },

        resetForm() {
            this.survey = {
                Name: '',
                RegionalName: '',
                Address: '',
                RegionalAddress: '',
                URBNo: '',
                MobileNumber: '',
                VRM_Id: '',
                Age: '',
                Gender: 'Male',
                Members: [],
                translationStatus: {
                    Name: null,
                    Address: null
                }
            };
            this.showConfirmation = false;
            this.showModal = false;
            this.urbNoError = '';
            this.mobileNoError = '';
            this.validURBNo = false;
            this.submissionError = null;
            this.responseData = {
                Success: false,
                Message: '',
                Results: [],
                VrmTotalMembers: 0
            };
            this.isSubmitting = false;
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
});
