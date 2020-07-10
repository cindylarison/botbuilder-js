/**
 * @module adaptive-expressions
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ExpressionEvaluator } from '../expressionEvaluator';
import { Expression } from '../expression';
import { ReturnType } from '../returnType';
import { ExpressionType } from '../expressionType';
import { FunctionUtils } from '../functionUtils';
import { Options } from '../options';

/**
 * Return items from the front of a collection.
 */
export class Take extends ExpressionEvaluator {
    public constructor(){
        super(ExpressionType.Take, Take.evaluator, ReturnType.Array, Take.validator);
    }

    private static evaluator(expression: Expression, state: any, options: Options): {value: any; error: string} {
        let result: any;
        let error: any;
        let arr: any;
        ({value: arr, error} = expression.children[0].tryEvaluate(state, options));

        if (!error) {
            if (Array.isArray(arr) || typeof arr === 'string') {
                let start: number;

                const startExpr: Expression = expression.children[1];
                ({value: start, error} = startExpr.tryEvaluate(state, options));
                if (!error && !Number.isInteger(start)) {
                    error = `${startExpr} is not an integer.`;
                } else if (start < 0 || start >= arr.length) {
                    error = `${startExpr}=${start} which is out of range for ${arr}`;
                }
                if (!error) {
                    result = arr.slice(0, start);
                }
            } else {
                error = `${expression.children[0]} is not array or string.`;
            }
        }

        return {value: result, error};
    }


    private static validator(expression: Expression): void {
        FunctionUtils.validateOrder(expression, [], ReturnType.Array, ReturnType.Number);
    }
}