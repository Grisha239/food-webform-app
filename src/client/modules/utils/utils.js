import {LightningElement} from 'lwc';
import SETTINGS from "./constantIds.json";
import ACTIVITIES from './activityCategoryIds.json';

const EMPTY_ACTIVITY_OBJECT = {
    'AccountId': '',
    'ActivityCategory': '',
    'Owner': '',
    'Service': '',
    'Status': SETTINGS.ACTIVITY_STATUS.OPEN,
    'Type': '',
    'GoCabinet': '',
    'Opportunity': '',
    'Priority': '',
    'Contact': '',
    'PingPolicyPosition': 0,
    'MaxAttemptsPerDay': 0,
    'ClosedFromForms': false,
    'Result': '',
    'GoResponseJson': ''
}

const EMPTY_OPPORTUNITY_OBJECT = {
    'GoContractType': '',
    'Stage': '',
    'GoPaymentType': '',
    'Opportunity': '',
    'Budget' : null,
}

class Utils extends LightningElement {
    questionData;
    pageInfo;
    localization;
    voiceRecognition;
    disableComplete = false;
    timeTable = [];

    constructor() {
        super();
        const styles = document.createElement('link');
        styles.href = './resources/css/bootstrap.min.css';
        styles.rel = 'stylesheet';
        this.template.appendChild(styles);

        const webFormStyles = document.createElement('link');
        webFormStyles.href = './resources/css/webform.css';
        webFormStyles.rel = 'stylesheet';
        this.template.appendChild(webFormStyles);
    }

    initTimeTable() {
        for (let i = 0; i < 24 * 60; i = i + 15) {   // each 15 minutes
            let hours = `${Math.floor(i / 60)}`;
            let minutes = `${i % 60}`;
            if (hours.length === 1) {
                hours = '0' + hours;
            }
            if (minutes.length === 1) {
                minutes = '0' + minutes;
            }
            this.timeTable.push(`${hours}:${minutes}`);
        }
    }

    isFormValid() {
        let isValidInputs = this.validateInputs();
        let isValidRadioButtons = this.validateRadioButtons();
        let isValidMultiPicklists = this.validateMultiPicklists();
        let isValidSelects = this.validateSelects();
        return isValidInputs && isValidRadioButtons && isValidMultiPicklists && isValidSelects;
    }

    isPhoneValid(str, countryId) {
        if (str === "") return true;
        switch (countryId) {
            case SETTINGS.OPPORTUNITY_COUNTRY.ARMENIA:
                return ((/^\+374\d{8}$/.test(str)) || (/^\+995\d{9}$/.test(str)));
            case SETTINGS.OPPORTUNITY_COUNTRY.BELARUS:
                return (/^\+375\d{9}$/.test(str));
            case SETTINGS.OPPORTUNITY_COUNTRY.RUSSIA:
                return (/^\+7\d{10}$/.test(str));
            case SETTINGS.OPPORTUNITY_COUNTRY.KAZAKHSTAN:
                return (/^\+7\d{10}$/.test(str));
            default:
                return true;
        }
    }

    isEmailValid(str) {
        if (str === '') return true;
        if (!/^.+@.+[.].+$/.test(str)) return false;
        if (/@.*@/.test(str)) return false;
        if (/[^\-.0-9@A-Z_a-z]/.test(str)) return false;
        return true;
    }

    validateInputs() {
        const countryId = this.pageInfo.opportunityCountryId || this.pageInfo.goCabAccCountryId;
        let inputs = this.template.querySelectorAll('.form-control');
        let isValid = true;

        inputs.forEach(elem => {
            if (elem.type === 'email' && !this.isEmailValid(elem.value)) {
                elem.classList.add('is-invalid');
                isValid = false;
            } else if (elem.hasAttribute('validate-phone') && !this.isPhoneValid(elem.value, countryId)) {
                elem.classList.add('is-invalid');
                isValid = false;
            } else if (elem.hasAttribute('required') && !elem.value) {
                elem.classList.add('is-invalid');
                isValid = false;
            } else if(elem.hasAttribute('validate-positive') && (elem.value < 1 || !Number.isInteger(Number(elem.value)))) {
                elem.classList.add('is-invalid');
                isValid = false;
            }
            else {
                elem.classList.remove('is-invalid');
            }

        });
        return isValid;
    }

    validateRadioButtons() {
        let checks = this.template.querySelectorAll('.form-check-input');
        let isValid = true;
        let checkboxGroup = new Set();
        checks.forEach(elem => {
            if(elem.hasAttribute('required')) {
                if(elem.classList.contains('checkbox-group')) {
                    checkboxGroup.add(elem.attributes.field.value);
                }
                else if(elem.type === 'radio' && this.questionData[elem.dataset.field].value.Empty) {
                    elem.classList.add('is-invalid');
                    isValid = false;
                }
                else if(elem.type === 'checkbox' && !this.questionData[elem.dataset.field].value) {
                    elem.classList.add('is-invalid');
                    isValid = false;
                }
                else {
                    elem.classList.remove('is-invalid');
                }
            }
        });
        checkboxGroup.forEach(field => {
            let elements = this.template.querySelectorAll(`[field="${field}"]`);
            let hasSelected = false;
            elements.forEach(elem => { hasSelected ||= elem.checked; });
            elements.forEach(elem => {
                if(hasSelected) {
                    elem.classList.remove('is-invalid');
                } else {
                    elem.classList.add('is-invalid');
                    isValid = false;
                }
            })
        });
        return isValid;
    }

    validateMultiPicklists() {
        let picklists = this.template.querySelectorAll('my-multipicklist');
        let isValid = true;
        picklists.forEach(picklist => {
            isValid &&= picklist.validate();
        });
        return isValid;
    }

    validateSelects() {
        let selects = this.template.querySelectorAll('.form-select');
        let isValid = true;
        selects.forEach(elem => {
            if(elem.hasAttribute('required')) {
                if(!this.questionData[elem.dataset.field].value) {
                    elem.classList.add('is-invalid');
                    isValid = false;
                }
                else {
                    elem.classList.remove('is-invalid');
                }
            }
        });
        return isValid;
    }

    handleFieldChange(evt) {
        let fieldType = evt.target.type;
        let currentField = evt.target.dataset.field;
        let elem = this.template.querySelector(`[data-field="${currentField}"]`);

        if(this.questionData[currentField] === undefined) { //for checkbox groups
            let fieldName = evt.target.attributes.getNamedItem('field').value;
            let optionName = evt.target.id;
            if(this.questionData[fieldName]?.selected && !evt.target.hasAttribute('single-variant')) {
                let selected = this.questionData[fieldName].selected.find(option => option.label === optionName);
                selected.selected = !selected.selected;
                return;
            }

            this.questionData[fieldName]?.selected.forEach(option => {
                option.selected = option.label === optionName ? !option.selected : false;
            });
            return;
        }

        this.questionData[currentField].value = evt.target.value;
        if (currentField === "goCabinetService") {
            this.questionData.goCabinetService.isChanged = true;
        }
        if (elem.tagName === 'INPUT') {
            if (fieldType === 'checkbox') {
                this.questionData[currentField].value = evt.target.checked;
            } else if (fieldType === 'radio') {
                let radioObject = {
                    Empty: false,
                    Yes: false,
                    No: false,
                    Later: false,
                    Maybe: false
                };
                radioObject[evt.target.value] = true;
                this.questionData[currentField].value = radioObject;
            } else if ((fieldType === 'time') || (fieldType === 'date')) {
                if (fieldType === 'time') this.questionData[currentField].time = evt.target.value;
                if (fieldType === 'date') this.questionData[currentField].date = evt.target.value;
                if (!this.questionData[currentField].time) this.questionData[currentField].time = this.getCurrentTime();
                //if (!this.questionData[currentField].date) this.questionData[currentField].date = this.getCurrentDate();
                this.questionData[currentField].value = new Date(this.questionData[currentField].date + " " + this.questionData[currentField].time);
            }
        } else if (elem.tagName === 'SELECT') {
            let selected = evt.target.value;
            let picklistField = "Name";
            this.selectPicklistOption(currentField, selected, picklistField);
        }
    }

    getCurrentTime() {
        const date = new Date(Date.now());
        let hours = date.getHours().toString();
        let minutes = date.getMinutes().toString();
        if (hours.length === 1) {
            hours = '0' + hours;
        }
        if (minutes.length === 1) {
            minutes = '0' + minutes;
        }
        return `${hours}:${minutes}`
    }

    getCurrentDate() {
        let date = new Date(Date.now());
        date.setHours(0,0,0,0);
        return date;
    }

    selectPicklistOption(picklistName, optionName, picklistField) {
        let picklist = this.getPicklist(picklistName);
        picklist.allValues.forEach(elem => {
            if(elem[picklistField] === optionName) {
                elem.Selected = true;
                picklist.value = picklist.customPicklist ? elem.Name : elem.Id;
            }
            else {
                elem.Selected = false;
            }
        });
    }


    getFormattedDate(date) { //DD-MM-YYYY
        if(date) {
            return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        }
        return "";
    }

    getPicklist(name) {
        return this.questionData[this.lowercaseFirstLetter(name)];
    }

    lowercaseFirstLetter(string) {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    uppercaseFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    getFormFields() {
        let checkedFields = [];
        let inputs = this.template.querySelectorAll('.form-control');
        inputs.forEach(elem => {
            if(elem.value) {
                checkedFields.push(elem.dataset.field);
            }
        });
        let selects = this.template.querySelectorAll('.form-select');
        selects.forEach(elem => {
            if(elem.value){
                checkedFields.push(elem.dataset.field)
            }
        });
        let checks = this.template.querySelectorAll('.form-check-input');
        checks.forEach(elem => {
            if(elem.type === 'radio' && elem.value) {
                checkedFields.push(elem.dataset.field)
            } else if(elem.classList.contains('checkbox-group') && elem.checked) {
                checkedFields.push(elem.attributes.field.value);
            } else if(elem.checked && elem.value) {
                checkedFields.push(elem.dataset.field)
            }
        });
        let multiPicklists = this.template.querySelectorAll('my-multipicklist');
        multiPicklists.forEach(elem => {
            if(elem.picklist && elem.selected.length > 0) {
                checkedFields.push(elem.picklist)
            }
        });
        let rejections = this.template.querySelectorAll('my-rejections');
        rejections.forEach(elem => {
            if(elem.id) {
                checkedFields.push(elem.id)
            }
        });

        return [...new Set(checkedFields)];
    }

    processFormData(selectedFields, dataObject) {
        let formData = [];
        for(let field in dataObject) {
            if(selectedFields.includes(this.uppercaseFirstLetter(field)) //for multi-picklists
                || (selectedFields.includes(field) && Array.isArray(dataObject[field].selected))) {
                let picklist = this.getPicklist(field);
                if(picklist.selected !== undefined) {
                    let picklistOptions = '';
                    picklist.selected.forEach(option => {
                        if(picklist['checkbox-group'] && !option.selected) {
                            return;
                        }
                        picklistOptions += option.label.trim() + '; ';
                    });
                    formData.push({
                        'label': picklist.label,
                        'value': picklistOptions.trim(),
                    });
                }
            } else if(selectedFields.includes(field) && !dataObject[field].utility) {
                if(dataObject[field].value?.Empty !== undefined) { //for radio buttons
                    if(dataObject[field].unique) {
                        if(dataObject[field].value.Empty === false) {
                            let value = '';
                            if(dataObject[field].value.Yes) {
                                value = dataObject[field].labelYes;
                            } else if(dataObject[field].value.No) {
                                value = dataObject[field].labelNo;
                            } else if(dataObject[field].value.Later) {
                                value = dataObject[field].labelLater;
                            } else if(dataObject[field].value.Maybe) {
                                value = dataObject[field].labelMaybe;
                            }
                            formData.push({label: dataObject[field].label, value: value});
                        }
                    } else {
                        formData.push({label: dataObject[field].label, value: dataObject[field].value.Yes});
                    }
                }
                else {
                    formData.push({label: dataObject[field].label, value: dataObject[field].value});
                }
            }
        }

        console.log(JSON.stringify(formData));
        return formData;
    }

    handleMultiSelection(evt) {
        evt.stopPropagation();
        let selection = JSON.parse(evt.detail);
        let picklist = this.getPicklist(selection.name);
        if(picklist) {
            picklist.selected = selection.data;
        }
    }

    handleComplete() {
        setTimeout( () => {
            this.sendMsgToParent(JSON.stringify({command: "CompleteForm"}));
        }, 1000);
    }

    handleLostProcess() {
        setTimeout( () => {
            this.sendMsgToParent(JSON.stringify({command: "StartOpportunityLostProcess"}));
        }, 1000);
    }

    handleLostCabinetProcess() {
        setTimeout( () => {
            this.sendMsgToParent(JSON.stringify({command: "StartCabinetLostProcess", info:{
                GoServiceId: this.pageInfo.serviceId,
                GoLostReason: this.questionData?.goLostReason.value
            }}));
        }, 1000);
    }

    isJsonString (text) {
        if (text == null) {
            return false;
        }

        try {
            JSON.parse(text);
        } catch {
            return false;
        }
        return true;
    }

    sendMsgToParent(message) {
        window.parent.postMessage((message), '*');
    }

    get isPage0() {
        return this.pageInfo.pageIndex === 0;
    }

    get isPage1() {
        return this.pageInfo.pageIndex === 1;
    }

    get isPage2() {
        return this.pageInfo.pageIndex === 2;
    }

    get isPage3() {
        return this.pageInfo.pageIndex === 3;
    }

    get isPage4() {
        return this.pageInfo.pageIndex === 4;
    }

    get isPage5() {
        return this.pageInfo.pageIndex === 5;
    }

    get isPage6() {
        return this.pageInfo.pageIndex === 6;
    }

    get isPage7() {
        return this.pageInfo.pageIndex === 7;
    }

    get defaultActivityObject() {
        let activityObject = {...EMPTY_ACTIVITY_OBJECT};
        activityObject.AccountId = this.pageInfo.accountId || this.pageInfo.AccountId;
        activityObject.Owner = this.pageInfo.ownerId;
        activityObject.Service = this.pageInfo.serviceId;
        activityObject.Status = SETTINGS.ACTIVITY_STATUS.OPEN;
        activityObject.GoCabinet = this.pageInfo.cabinetId;
        activityObject.Opportunity = this.pageInfo.opportunityId;
        activityObject.Priority = SETTINGS.ACTIVITY_PRIORITY.MEDIUM;
        activityObject.Contact = this.pageInfo.contactId;
        return activityObject;
    }

    handleIframeEvents() {
        window.onmessage = (event) => {
            if (!this.isJsonString(event.data)) return;

            let message = event.data ? JSON.parse(event.data) : {};
            if (message?.command) {
                let command = message.command;
                let info = message.data;

                this.handleIframeCommands(command, info);
            }
        }
    }

    get product() {
        return this.pageInfo.productId;
    }

    updateActivity(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateActivityForm",
            info: data
        }));
    }

    updateService(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateService",
            info: data
        }));
    }

    updateOpportunity(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateOpportunity",
            info: data
        }));
    }

    updateMultiPicklist(name, skipDeletion) {
        let picklist = this.getPicklist(name);
        let selectedIds = [];
        let newValues = [];
        picklist.selected.forEach(selected => {
            let index = picklist.defaultSelected.findIndex(defaultValue => selected.value === defaultValue.value);
            if(skipDeletion || index === -1) {
                newValues.push(selected.value);
            } else {
                selectedIds.push(picklist.defaultSelected[index].id);
            }
        });
        let data = {
            Object: name,
            MatchByColumn: picklist.matchByColumn,
            MatchById: picklist.matchById,
            Selected: selectedIds,
            ToInsert: newValues,
            PicklistName: picklist.mainColumn,
            SkipDeletion: skipDeletion, //if true, only insert selected elements
        };

        this.sendMsgToParent(JSON.stringify({
            command: this.isFinalScreen ? "UpdateFinalScreenMultiPicklist" : "UpdateMultiPicklist",
            info: data
        }));
    }

    updateContact(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateContact",
            info: data
        }));
    }

    createContact(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateContact",
            info: data
        }));
    }

    createOpportunityContact(contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateOpportunityContact",
            info: {
                'Opportunity': this.pageInfo.opportunityId,
                'Contact': contactId
            }
        }));
    }

    createContactCommunication(contactId, extraPhone, communicationType) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateContactCommunication",
            info: {
                'Contact': contactId,
                'ExtraPhone': extraPhone,
                'CommunicationType': communicationType
            }
        }));
    }

    createGoAccountTeam(accountId, contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateGoAccountTeam",
            info: {
                'Account': accountId,
                'Contact': contactId
            }
        }));
    }

    findGoAccountTeam(accountId, contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "FindGoAccountTeam",
            info: {
                'Account': accountId,
                'Contact': contactId
            }
        }));
    }

    createGoContactInCabinet(cabinetId, contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateGoContactInCabinet",
            info: {
                'Cabinet': cabinetId,
                'Contact': contactId
            }
        }));
    }

    findGoContactInCabinet(cabinetId, contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "FindGoContactInCabinet",
            info: {
                'Cabinet': cabinetId,
                'Contact': contactId
            }
        }));
    }

    createActivity(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "CreateActivity",
            info: data
        }));
    }

    updateOrCreateContact(data) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateOrCreateContact",
            info: data
        }));
    }

    handleObjectUpdate(evt) {
        let detail = JSON.parse(evt.detail);
        switch(detail.message) {
            case 'UpdateActivity':
            case 'CloseActivity':
                this.updateActivity(detail.data);
                break;
            case 'CreateActivity':
                this.createActivity(detail.data);
                break;
            case 'UpdateOpportunity':
                this.updateOpportunity(detail.data);
                break;
            case 'UpdateService':
                this.updateService(detail.data);
                break;
            case 'CreateContact':
                this.questionData.extraPhone.value = detail.data.MobilePhone;
                this.createContact(detail.data);
                break;
            default:
        }
    }

    updateFinalJSON() {
        let selectedFields = this.getFormFields();
        let oldData = [];
        let newData;
        if(this.isJsonString(this.pageInfo.finalJSON)) { //if we have data from previous screen(s)
            oldData = JSON.parse(this.pageInfo.finalJSON);
        }
        let currentData = this.processFormData(selectedFields, this.questionData);
        newData = oldData ? oldData.concat(currentData) : currentData;
        this.pageInfo.finalJSON = JSON.stringify(newData);
    }

    passDataToChildComponent(evt) {
        let childId = evt.target.id;
        let data = this.questionData[childId]?.value;
        if(data) {
            let child = this.template.querySelector(`[id="${childId}"]`);
            child.getDataFromParent(JSON.stringify(data));
        }
    }

    handleMultiPicklist(info) {
        let picklist = this.getPicklist(info.picklist);
        picklist.selected = info.values;
        if(picklist.defaultSelected) {
            picklist.defaultSelected = info.values;
        }
        picklist.matchByColumn = info.matchByColumn;
        picklist.matchById = info.matchById;
        picklist.mainColumn = info.mainColumn;
    }

    handleClickToCall() {
        this.pageInfo.callIsMade = true;
        const message = {
            command : 'ClickToCall',
            number : this.questionData.contactPhones.value, //Номер телефона
            caption : 'Заголовок для записи объекта Call',
            entitySchemaName: 'Contact', // лукап на Call. Обычно Контакт/Аккаунт
            customerId: this.pageInfo.contactId || this.pageInfo.ContactId, // айдишка этого  Контакт/Аккаунт            
            parentSchemaName: 'Activity',
            parentRecordId: this.pageInfo.ActivityId ||  this.pageInfo.activityId 
        };
        this.sendMsgToParent(JSON.stringify({
            command: "ClickToCall",
            info: JSON.stringify(message)
        }));
        this.template.querySelector(`[id="click-2-call"]`).blur();
    }

    get showClick2Call() {
        return this.questionData.contactPhones.allValues?.length > 0 && this.questionData.contactPhones.value;
    }

    get callIsMade() {
        return this.getActivityTypeFromActivityCategory(this.pageInfo.activityCategory) !== SETTINGS.ACTIVITY_TYPE.CALL
            || this.pageInfo.doNotListenToCall
            || this.pageInfo.callIsMade
            || !this.pageInfo.nextButtonPressed
            || this.questionData.hadIncomingCall?.value
            || this.questionData.incorrectTask?.value;
    }

    updateServiceContact(contactId) {
        this.sendMsgToParent(JSON.stringify({
            command: "UpdateServiceContact",
            info: contactId
        }));
    }

    getInvalidPhoneMessage(countryId, errorMessages) {
        switch (countryId) {
            case SETTINGS.OPPORTUNITY_COUNTRY.ARMENIA:
                return errorMessages.ARMENIA;
            case SETTINGS.OPPORTUNITY_COUNTRY.BELARUS:
                return errorMessages.BELARUS;
            case SETTINGS.OPPORTUNITY_COUNTRY.RUSSIA:
                return errorMessages.RUSSIA;
            case SETTINGS.OPPORTUNITY_COUNTRY.KAZAKHSTAN:
                return errorMessages.KAZAKHSTAN;
            default:
                return "ERROR. No Country Found!";
        }
    }

    getActivityTypeFromActivityCategory(category) {
        if (Object.values(ACTIVITIES.BASIC_ACTIVITY).includes(category) || Object.values(ACTIVITIES.ADD_ACTIVITY).includes(category)) {
            return ACTIVITIES.ACTIVITY_TYPE.ACTIVITY;
        }
        if (Object.values(ACTIVITIES.BASIC_CALL).includes(category) || Object.values(ACTIVITIES.ADD_CALL).includes(category)) {
            return ACTIVITIES.ACTIVITY_TYPE.CALL;
        }
        if (Object.values(ACTIVITIES.BASIC_EMAIL_AND_MESSENGER).includes(category) || Object.values(ACTIVITIES.ADD_EMAIL_AND_MESSENGER).includes(category)) {
            return ACTIVITIES.ACTIVITY_TYPE.EMAIL_AND_MESSENGER;
        }
        if (Object.values(ACTIVITIES.BASIC_EVENT).includes(category) || Object.values(ACTIVITIES.ADD_EVENT).includes(category)) {
            return ACTIVITIES.ACTIVITY_TYPE.EVENT;
        }
        return ACTIVITIES.ACTIVITY_TYPE.CALL;
    }

    get disableCreatingNewContact() {
        return this.questionData.organization?.allValues.length === 0;
    }

    get createNewContactStyles() {
        return this.questionData.organization?.allValues.length > 0 ? "form-check-input" : "form-check-input is-invalid";
    }

    get activityCategories() {
        let categories = this.getPicklist('ActivityCategory');
        let types = this.getPicklist('ActivityType');
        if(this.lastTypeSelected !== types.value) {
            this.lastTypeSelected = types.value;
            categories.allValues[0].ActivityType = this.lastTypeSelected;
            switch (types.value) {
                case ACTIVITIES.ACTIVITY_TYPE.ACTIVITY:
                    this.selectPicklistOption('ActivityCategory', ACTIVITIES.BASIC_ACTIVITY.OTHER, 'Id');
                    categories.value = ACTIVITIES.BASIC_ACTIVITY.OTHER;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.CALL:
                    this.selectPicklistOption('ActivityCategory', ACTIVITIES.BASIC_CALL.OTHER, 'Id');
                    categories.value = ACTIVITIES.BASIC_CALL.OTHER;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.EVENT:
                    this.selectPicklistOption('ActivityCategory', ACTIVITIES.BASIC_EVENT.CONFERENCE, 'Id');
                    categories.value = ACTIVITIES.BASIC_EVENT.CONFERENCE;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.EMAIL_AND_MESSENGER:
                    this.selectPicklistOption('ActivityCategory', ACTIVITIES.BASIC_EMAIL_AND_MESSENGER.EMAIL, 'Id');
                    categories.value = ACTIVITIES.BASIC_EMAIL_AND_MESSENGER.EMAIL;
                    break;
                default:
                    console.log("Wrong Activity Type!");
                    return false;
            }
        }
        return categories.allValues.filter(category => {
            if (category.ActivityType !== this.questionData.activityType.value) {
                return false;
            }
            let allowedCategories = [];
            switch (category.ActivityType) {
                case ACTIVITIES.ACTIVITY_TYPE.ACTIVITY:
                    allowedCategories = ACTIVITIES.BASIC_ACTIVITY;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.CALL:
                    allowedCategories = ACTIVITIES.BASIC_CALL;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.EVENT:
                    allowedCategories = ACTIVITIES.BASIC_EVENT;
                    break;
                case ACTIVITIES.ACTIVITY_TYPE.EMAIL_AND_MESSENGER:
                    allowedCategories = ACTIVITIES.BASIC_EMAIL_AND_MESSENGER;
                    break;
                default:
                    console.log("Wrong Activity Type!");
                    return false;
            }
            if (this.userRoleIds) {
                if ((this.userRoleIds.includes(SETTINGS.USER_ROLE.ROLE1)) || (this.userRoleIds.includes(SETTINGS.USER_ROLE.ROLE2))) {
                    allowedCategories.CONTROL_CALL_CREATIVE = ACTIVITIES.ADD_CALL.CONTROL_CALL_CREATIVE;
                    allowedCategories.WAITING_FOR_CREATIVE = ACTIVITIES.ADD_ACTIVITY.WAITING_FOR_CREATIVE;
                    allowedCategories.FILL_CREATIVE_FORM = ACTIVITIES.ADD_ACTIVITY.FILL_CREATIVE_FORM;
                    allowedCategories.CONTROL_CREATIVE_APPROVAL = ACTIVITIES.ADD_ACTIVITY.CONTROL_CREATIVE_APPROVAL;
                }
                if ((this.userRoleIds.includes(SETTINGS.USER_ROLE.MODERATOR)) || (this.userRoleIds.includes(SETTINGS.USER_ROLE.LEAD_MODERATOR))) {
                    allowedCategories.CLIENT_REAPPLICATION = ACTIVITIES.ADD_CALL.CLIENT_REAPPLICATION;
                    allowedCategories.PREQUALIFICATION = ACTIVITIES.ADD_CALL.PREQUALIFICATION;
                }
                if ((this.userRoleIds.includes(SETTINGS.USER_ROLE.TENDER)) || (this.userRoleIds.includes(SETTINGS.USER_ROLE.LEAD_TENDER))) {
                    allowedCategories.READING_DOCUMENTATION = ACTIVITIES.ADD_ACTIVITY.READING_DOCUMENTATION;//translate properly
                    allowedCategories.GETTING_KP_READY = ACTIVITIES.ADD_ACTIVITY.GETTING_KP_READY;//translate properly
                    allowedCategories.DEBT = ACTIVITIES.ADD_ACTIVITY.DEBT;
                    allowedCategories.TENDER_MEETING = ACTIVITIES.ADD_EVENT.TENDER_MEETING;//translate properly
                    allowedCategories.ONLINE = ACTIVITIES.ADD_EVENT.ONLINE;
                    allowedCategories.POST_MEETING = ACTIVITIES.ADD_EMAIL_AND_MESSENGER.POST_MEETING;
                    allowedCategories.CALLBACK = ACTIVITIES.ADD_CALL.CALLBACK;//translate properly
                }
                if ((this.userRoleIds.includes(SETTINGS.USER_ROLE.QUALITY_CONTROL)) || (this.userRoleIds.includes(SETTINGS.USER_ROLE.LEAD_QUALITY_CONTROL))) {
                    allowedCategories.QUALITY_CONTROL_CHECK_CLIENT = ACTIVITIES.ADD_ACTIVITY.QUALITY_CONTROL_CHECK_CLIENT;
                }
            }
            return Object.values(allowedCategories).includes(category.Id);
        });
    }

    setupSpeechRecognition = () => {
        console.log("VR STARTED!");
        this.voiceRecognition = new webkitSpeechRecognition();
        if (!'webkitSpeechRecognition' in window) {
            console.log('Speech Recognition is not supported!');
        }
        //this.voiceRecognition.lang = this.localization;
        this.voiceRecognition.maxAlternatives = 1;
        this.voiceRecognition.onresult = (event) => {
            console.log("I HEAR U");
            console.log(event.results[0][0].transcript);
        }
        this.voiceRecognition.start();
    }
}

export { Utils }
