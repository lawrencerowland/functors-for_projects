import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const CurryingDemo = () => {
  const [setA, setSetA] = useState(2);
  const [setB, setSetB] = useState(2);
  const [setC, setSetC] = useState(2);
  const [regularMappings, setRegularMappings] = useState([]);
  const [curriedMappings, setCurriedMappings] = useState([]);

  useEffect(() => {
    generateMappings();
  }, [setA, setB, setC]);

  const generateMappings = () => {
    // Generate regular mappings (A × B) → C
    const regular = [];
    for (let a = 1; a <= setA; a++) {
      for (let b = 1; b <= setB; b++) {
        for (let c = 1; c <= setC; c++) {
          regular.push(`(${a},${b}) → ${c}`);
        }
      }
    }
    setRegularMappings(regular);

    // Generate curried mappings A → (B → C)
    const curried = [];
    for (let a = 1; a <= setA; a++) {
      const innerMappings = [];
      for (let b = 1; b <= setB; b++) {
        const cValues = Array.from({ length: setC }, (_, i) => i + 1).join(',');
        innerMappings.push(`${b} → {${cValues}}`);
      }
      curried.push(`${a} → {${innerMappings.join(', ')}}`);
    }
    setCurriedMappings(curried);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Currying Demonstration with Concrete Mappings</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-2">Set A (size)</label>
          <Select value={setA.toString()} onValueChange={(value) => setSetA(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(num => (
                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block mb-2">Set B (size)</label>
          <Select value={setB.toString()} onValueChange={(value) => setSetB(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(num => (
                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block mb-2">Set C (size)</label>
          <Select value={setC.toString()} onValueChange={(value) => setSetC(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(num => (
                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>Regular Function (A × B) → C</CardHeader>
          <CardContent>
            <p className="text-sm mb-2">Total functions: {regularMappings.length}</p>
            <div className="text-xs max-h-60 overflow-y-auto">
              {regularMappings.map((mapping, index) => (
                <p key={index}>{mapping}</p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Curried Function A → C^B</CardHeader>
          <CardContent>
            <p className="text-sm mb-2">Total functions: {curriedMappings.length * Math.pow(setC, setB)}</p>
            <div className="text-xs max-h-60 overflow-y-auto">
              {curriedMappings.map((mapping, index) => (
                <p key={index}>{mapping}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm">
        This demonstration shows all possible mappings for both the regular and curried functions.
        Notice that while the representations are different, the total number of possible functions is the same,
        illustrating the isomorphism between Set(A × B, C) and Set(A, C^B).
      </p>
    </div>
  );
};

export default CurryingDemo;
