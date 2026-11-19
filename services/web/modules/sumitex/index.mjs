import AnonymousEditorRouter from './app/src/AnonymousEditorRouter.mjs'

/**
 * SumiTeX's server-side module: what SumiTeX needs from the web service
 * without editing Overleaf's own files.
 *
 * @import { WebModule } from "../../types/web-module"
 */

/** @type {WebModule} */
const SumitexModule = {
  router: AnonymousEditorRouter,
}

export default SumitexModule
