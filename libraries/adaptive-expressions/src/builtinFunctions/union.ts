/**
 * @module adaptive-expressions
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ExpressionEvaluator, EvaluateExpressionDelegate } from '../expressionEvaluator';
import { Expression } from '../expression';
import { ReturnType } from '../returnType';
import { ExpressionType } from '../expressionType';
import { FunctionUtils } from '../functionUtils';

/**
 * Return a collection that has all the items from the specified collections.
 * To appear in the result, an item can appear in any collection passed to this function.
 * If one or more items have the same name, the last item with that name appears in the result.
 */
export class Union extends ExpressionEvaluator {
    public constructor(){
        super(ExpressionType.Union, Union.evaluator(), ReturnType.Array, Union.validator);
    }

    private static evaluator(): EvaluateExpressionDelegate {
        return FunctionUtils.apply(
            (args: any[]): any => {
                let result: any[] = [];
                for (const arg of args) {
                    result = result.concat(arg);
                }

                return Array.from(new Set(result));
            },
            FunctionUtils.verifyList);
    }

    private static validator(expression: Expression): void {
        FunctionUtils.validateArityAndAnyType(expression, 1, Number.MAX_SAFE_INTEGER, ReturnType.Array);
    }
}