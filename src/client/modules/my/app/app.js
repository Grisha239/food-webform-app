import SETTINGS from '../../utils/constantIds.json';
import {LightningElement} from 'lwc';

export default class App extends LightningElement {
    customCtor;
    activityCategoryId;
    activityTypeId;
    productId;

    async loadCtor() {
        let ctor;
        ctor = await import('../mainScreen/mainScreen');
        if(ctor) {
            this.customCtor = ctor.default;
        }
    }

    connectedCallback() {
        const currentIframeHref = new URL(document.location.href);
        this.activityCategoryId = currentIframeHref.searchParams.get('category');
        this.activityTypeId = currentIframeHref.searchParams.get('type');
        this.productId = currentIframeHref.searchParams.get('product');
        this.loadCtor();
    }
}
