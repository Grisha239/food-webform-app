import { track } from 'lwc';
import defaultInfo from './defaultInfo.json';
import defaultData from './defaultData.json';
import SETTINGS from '../../utils/constantIds.json';
import {Utils} from "../../utils/utils";

export default class MainScreen extends Utils {
    dataLoaded = false;
    @track
    pageInfo = defaultInfo;

    @track
    questionData = defaultData;

    connectedCallback() {
        this.initTimeTable();

        this.sendMsgToParent(JSON.stringify({command: "GetData"}));

        window.onmessage = (event) => {
            if (!this.isJsonString(event.data)) return;

            let message = event.data ? JSON.parse(event.data) : {};
            if (message && message.command) {
                let command = message.command;

                let info = message.data;

                if (command === 'SetData') {
                    this.dataLoaded = true;
                    this.pageInfo.activityId = info.ActivityId;
                    this.pageInfo.activityCategory = info.ActivityCategory?.value;
                    this.pageInfo.activityType = info.ActivityType?.value;
                    this.pageInfo.category = info.ActivityCategory?.value;
                    this.pageInfo.title = info.ActivityTitle;
                    this.pageInfo.opportunityId = info.OpportunityId;

                    this.pageInfo.contactId = info.ContactId;
                    this.pageInfo.clientName = info.ContactName;
                    this.pageInfo.contactPhone = info.ContactPhone;

                    this.pageInfo.goOffer = info.GoOffer;
                    this.pageInfo.goQuestionnaire = info.GoQuestionnaire;
                    this.pageInfo.goIsZoneCreated = info.GoIsZoneCreated;
                    this.pageInfo.goIsMenuFull = info.GoIsMenuFull;
                    this.pageInfo.goPreviousActivityComment = info.GoPreviousActivityComment;

                    this.pageInfo.detailedResult = info.DetailedResult || "";
                    this.pageInfo.callIsMade = false;
                    this.pageInfo.nextButtonPressed = false;

                    this.fillDefaultValues();
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

    get showWebForm() {
        return this.pageInfo.activityCategory === SETTINGS.ACTIVITY_CATEGORY.CALL &&
            this.pageInfo.activityType === SETTINGS.ACTIVITY_TYPE.ACTIVITY;
    }

    fillDefaultValues() {
        this.questionData.goOffer.value = this.pageInfo.goOffer;
        this.questionData.goQuestionnaire.value = this.pageInfo.goQuestionnaire;
        this.questionData.goIsZoneCreated.value = this.pageInfo.goIsZoneCreated;
        this.questionData.goIsMenuFull.value = this.pageInfo.goIsMenuFull;
    }

    get showGoOffer() {
        return !this.pageInfo.goOffer && this.pageInfo.activityCategory === SETTINGS.ACTIVITY_CATEGORY.PARTNER_REMINDER;
    }

    get showGoQuestionnaire() {
        return !this.pageInfo.goQuestionnaire && this.pageInfo.activityCategory === SETTINGS.ACTIVITY_CATEGORY.PARTNER_REMINDER;
    }

    get showGoIsZoneCreated() {
        return !this.pageInfo.goIsZoneCreated && this.pageInfo.activityCategory === SETTINGS.ACTIVITY_CATEGORY.PARTNER_REMINDER;
    }

    get showGoIsMenuFull() {
        return !this.pageInfo.goIsMenuFull && this.pageInfo.activityCategory === SETTINGS.ACTIVITY_CATEGORY.PARTNER_REMINDER;
    }

    get showCallTime() {
        return Object.values(SETTINGS.RESULTS).find(x => x === this.questionData.result.value);
    }

    get showPrevComment() {
        return this.pageInfo.goPreviousActivityComment;
    }

    handleFieldChange(evt) {
        super.handleFieldChange(evt);
        let currentField = evt.target.dataset.field;
        if (currentField === "name") {
            this.setContactPhones(this.getContactIdByContactName(evt.target.value));
        }
        if (currentField === "result") {
            if (this.questionData.result.value) {
                this.questionData.result.allValues = this.questionData.result.allValues.filter((x) => x.Name);
            }
        }
    }

    handleNextClick() {
        this.pageInfo.nextButtonPressed = true;
        if(!this.disableComplete && this.isValid()) {
            this.disableComplete = true;
            this.updateFinalJSON();

            let activityData = this.defaultActivityObject;
            activityData.Result = this.questionData.result.value;
            activityData.DetailedResult = this.questionData.detailedResult.value;
            activityData.GoOffer = this.questionData.goOffer.value;
            activityData.GoQuestionnaire = this.questionData.goQuestionnaire.value;
            activityData.GoIsZoneCreated = this.questionData.goIsZoneCreated.value;
            activityData.GoIsMenuFull = this.questionData.goIsMenuFull.value;
            activityData.Status = SETTINGS.ACTIVITY_STATUS.CLOSED;
            activityData.GoCallbackDate = this.questionData.nextTaskDate.value;
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
        let allowedTypes = Object.values(SETTINGS.COMMUNICATION_TYPE);
        this.questionData.contactPhones.allValues = this.questionData.phonesList.allValues.filter(x => x.ContactId === contactId);
        this.questionData.contactPhones.allValues = this.questionData.contactPhones.allValues.filter(x => allowedTypes.includes(x.CommunicationType.value));
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

    onCloseFormClick() {
        this.sendMsgToParent(JSON.stringify({command: "CompleteForm"}));
    }
}