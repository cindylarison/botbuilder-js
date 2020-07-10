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
 * Return true if a given input is a complex object or return false if it is a primitive object.
 * Primitive objects include strings, numbers, and Booleans;
 * complex types, like classes, contain properties.
 */
export class IsObject extends ExpressionEvaluator {
    public constructor(){
        super(ExpressionType.IsObject, IsObject.evaluator(), ReturnType.Boolean, FunctionUtils.validateUnary);
    }

    private static evaluator(): EvaluateExpressionDelegate {
        return FunctionUtils.apply(
            (args: any[]): boolean => typeof args[0] === 'object');
    }
}