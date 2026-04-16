import { initInputMask } from './modules/InputMask.js';
import { initInputSanitize } from './modules/InputSanitize.js';
import { initDynamicColspan } from "./modules/DynamicColspan.js";
import { initZipcodeSearch } from "./modules/ZipcodeSearch.js";
import { initVisibilityToggle } from "./modules/VisibilityToggle.js";
import { initCheckboxGroup } from "./modules/CheckboxGroup.js";
import { initCopyText } from "./modules/CopyText.js";
import { initLoader } from './modules/Loader.js';
import { initNavLoader } from './modules/NavLoader.js';
import { initAjaxForm } from './modules/AjaxForm.js';
import { initDatalist } from './modules/DatalistManager.js';
import { initAutoOpen } from './modules/AutoOpen.js';
import { initConsentManager } from './modules/ConsentManager.js';
import { initPreferenceManager } from './modules/PreferenceManager.js';
import { initValidate } from './modules/Validate.js';
import { initRemoteSelect } from './modules/RemoteSelect.js';
import { initTabsPersistence } from './modules/TabsPersistence.js';
import { initFormSubmitControl } from './modules/FormSubmitControl.js';
import { initCalc } from "./modules/Calc.js";

export function initCore(scope = document) {
    initLoader(scope);
    initNavLoader(scope);
    initInputMask(scope);
    initInputSanitize(scope);
    initDynamicColspan(scope);
    initZipcodeSearch(scope);
    initVisibilityToggle(scope);
    initCheckboxGroup(scope);
    initCopyText(scope);
    initAjaxForm(scope);
    initDatalist(scope);
    initConsentManager(scope);
    initPreferenceManager(scope);
    initValidate(scope);
    initRemoteSelect(scope);
    initFormSubmitControl(scope);
    initCalc(scope);

    initTabsPersistence(scope);
    initAutoOpen(scope); // por último, porque pode disparar cliques
}
