/**
 * @module adaptive-expressions
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ExpressionEvaluator, EvaluateExpressionDelegate } from '../expressionEvaluator';
import { ReturnType } from '../returnType';
import { ExpressionType } from '../expressionType';
import { FunctionUtils } from '../functionUtils';

/**
 * For the MostSpecificSelector, this is a short hand so that instead of having to do A &amp; B and A you can do A &amp; optional(B) to mean the same thing.
 */
export class Optional extends ExpressionEvaluator {
    public constructor(){
        super(ExpressionType.Optional, Optional.evaluator(), ReturnType.Boolean, FunctionUtils.validateUnaryBoolean);
    }

    private static evaluator(): EvaluateExpressionDelegate {
        return undefined;
    }
}