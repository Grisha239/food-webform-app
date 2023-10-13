import { track } from 'lwc';
import defaultInfo from './defaultInfo.json';
import defaultData from './defaultData.json';
import SETTINGS from '../../utils/constantIds.json';
import {Utils} from "../../utils/utils";
const moment = require('moment-business-days');

export default class MainScreen extends Utils {
    @track
    pageInfo = defaultInfo;

    @track
    questionData = defaultData;

    connectedCallback() {
        this.initTimeTable();
        moment.updateLocale('ru', {
            workingWeekdays: [1, 2, 3, 4, 5]
        });

        this.sendMsgToParent(JSON.stringify({command: "GetData"}));

        window.onmessage = (event) => {
            if (!this.isJsonString(event.data)) return;

            let message = event.data ? JSON.parse(event.data) : {};
            if (message && message.command) {
                let command = message.command;

                let info = message.data;

                if (command === 'SetData') {
                    this.pageInfo.activityId = info.ActivityId;
                    this.pageInfo.activityCategory = info.ActivityCategory?.value;
                    this.pageInfo.category = info.ActivityCategory?.value;
                    this.pageInfo.title = info.ActivityTitle;
                    this.pageInfo.opportunityId = info.OpportunityId;

                    this.pageInfo.contactId = info.ContactId;
                    this.pageInfo.clientName = info.ContactName;
                    this.pageInfo.contactPhone = info.ContactPhone;

                    this.pageInfo.goOffer = info.GoOffer;
                    this.pageInfo.goQuestionnaire = info.GoQuestionnaire;

                    this.pageInfo.detailedResult = info.DetailedResult || "";
                    this.pageInfo.callIsMade = false;
                    this.pageInfo.nextButtonPressed = false;
                    this.localization = info.locale;
                    if(info.locale !== SETTINGS.LOCALE["RU-RU"]) {
                        this.translateLabels(info.locale);
                    } else {
                        this.fillDefaultValues();
                    }
                }
                else if (command === 'SetContactData') {
                    if (info.length !== 0) {
                        this.setContactList(info);
                        this.pageInfo.contactId = info[0].Id;
                        this.pageInfo.clientName = info[0].Name;
                        this.pageInfo.contactPhone = info[0].Number;
                    }
                }
                else if (command === 'SetContactPhones') {
                    this.questionData.phonesList.allValues = [...this.questionData.phonesList.allValues, ...info];
                    this.setContactPhones(this.pageInfo.contactId);
                }
                else if (command === 'SetResultEntries') {
                    this.questionData.result.allValues = [{Id: "", Name: "", Selected: true}, ...info];
                    this.questionData.result.value = "";
                }
            } else {
                console.log('ERROR: No message received!');
            }
        }
    }

    translateLabels(locale) {
        if(locale === SETTINGS.LOCALE["EN-US"]) {
            import('./locale/en-US.json').then((localization) => {
                this.localizeButtons(localization);
                this.localizeGeneralFields(localization);
                this.translateAdditionalFields(localization);
                this.fillDefaultValues();
            });
        }
    }

    translateAdditionalFields(localization) {
        this.questionData.comment.value = localization.comment.value;
        this.questionData.declineReason.selected = localization.declineReason.selected;
        this.questionData.emailSubject.value = localization.emailSubject.value;
        this.questionData.callResultUnsuccessful.value = localization.callResultUnsuccessful.value;
    }

    fillDefaultValues() {
        this.questionData.goOffer.value = this.pageInfo.goOffer;
        this.questionData.goQuestionnaire.value = this.pageInfo.goQuestionnaire;
    }

    get isLastPage() {
        return true;
    }

    get showGoOffer() {
        return !this.pageInfo.goOffer;
    }

    get showGoQuestionnaire() {
        return !this.pageInfo.goQuestionnaire;
    }

    handleFieldChange(evt) {
        let currentField = evt.target.dataset.field;
        super.handleFieldChange(evt);
        if (currentField === "name") {
            this.setContactPhones(this.getContactIdByContactName(evt.target.value));
        }
    }

    handleNextClick() {
        this.pageInfo.nextButtonPressed = true;
        if(!this.disableComplete && this.isValid()) {
            this.disableComplete = true;
            this.updateFinalJSON();

            let activityData = this.defaultActivityObject;
            activityData.Result = this.questionData.result.value;
            activityData.DetailedResult = this.questionData.detailedResult.value;;
            activityData.Status = SETTINGS.ACTIVITY_STATUS.CLOSED;
            this.updateActivity(activityData);

            this.handleComplete();
        }
    }

    isValid() {
        let isValidClickToCall = this.validateClickToCall();
        return isValidClickToCall && this.isFormValid();
    }

    validateClickToCall() {
        return this.getActivityTypeFromActivityCategory(this.pageInfo.activityCategory) !== SETTINGS.ACTIVITY_TYPE.CALL
            || this.pageInfo.doNotListenToCall
            || this.pageInfo.callIsMade;
    }

    setContactList(contacts) {
        this.questionData.name.allValues = contacts;
        this.selectPicklistOption('name', contacts[0].Id, 'Id');
        this.questionData.name.value = contacts[0].Name;
    }

    setContactPhones(contactId) {
        this.questionData.contactPhones.allValues = this.questionData.phonesList.allValues.filter((x) => (x.ContactId === contactId));
        this.questionData.contactPhones.value = this.questionData.contactPhones.allValues.find(function(x) {x.ContactId === contactId});
        this.selectPicklistOption('contactPhones', contactId, 'ContactId');
    }

    getContactIdByContactName(contactName) {
        return this.questionData.name.allValues.find((x) => (x.Name === contactName)).Id;
    }

    selectPicklistOption(picklistName, optionName, picklistField) {
        if (picklistName === "name") {
            let picklist = this.getPicklist(picklistName);
            this.questionData.name.allValues.forEach(elem => {
                if(elem[picklistField] === optionName) {
                    elem.Selected = true;
                    this.questionData.name.value = elem.Name;
                    this.questionData.clientName = elem.Name;
                    this.pageInfo.contactId = elem.Id;
                }
                else {
                    elem.Selected = false;
                }
            });
        } else {
            super.selectPicklistOption(picklistName, optionName, picklistField);
        }
    }
}