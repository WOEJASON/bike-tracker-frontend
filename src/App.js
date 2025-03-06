import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [newWeekDate, setNewWeekDate] = useState('');
  const [distances, setDistances] = useState({
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  });
  const [bonus, setBonus] = useState(20);
  const [showHistory, setShowHistory] = useState(false);
  const [image, setImage] = useState(null);

  const API_URL = 'https://bike-tracker-backend.vercel.app/api/data'; // 替换为后端部署 URL

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/data`);
      const weekData = response.data.filter(w => w.weekId !== 'attendanceBonus');
      setWeeks(weekData);
      const bonusData = response.data.find(w => w.weekId === 'attendanceBonus');
      if (bonusData) setBonus(bonusData.value);
      if (selectedWeek) {
        const selectedData = weekData.find(w => w.weekId === selectedWeek);
        if (selectedData) setDistances(selectedData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [selectedWeek, API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getWeekDates = (weekKey) => {
    if (!weekKey || !weekKey.startsWith('week-')) return { start: '', end: '' };
    const dateStr = weekKey.replace('week-', '');
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return {
      start: startDate.toLocaleDateString('zh-CN'),
      end: endDate.toLocaleDateString('zh-CN')
    };
  };

  const calculateAttendanceBonus = (weeksList, upToIndex) => {
    let currentBonus = 20;
    for (let i = 0; i < upToIndex && i < weeksList.length; i++) {
      const weekData = weeksList[i];
      if (weekData.sat >= 5 && weekData.sun >= 5) {
        currentBonus += 2;
      } else {
        currentBonus -= 2;
      }
      currentBonus = Math.max(20, currentBonus);
    }
    return currentBonus;
  };

  const handleAddWeek = async () => {
    console.log('Adding week with date:', newWeekDate);
    if (!newWeekDate) {
      alert('请选择一个日期');
      return;
    }
    const startDate = new Date(newWeekDate);
    const day = startDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diff);

    const weekKey = `week-${startDate.toISOString().split('T')[0]}`;
    if (weeks.some(w => w.weekId === weekKey)) {
      alert('此周已存在');
      return;
    }

    const newWeekData = { weekId: weekKey, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
    try {
      console.log('Sending request to:', `${API_URL}/save`, newWeekData);
      const response = await axios.post(`${API_URL}/save`, newWeekData);
      console.log('Response:', response.data);
      setWeeks([...weeks, newWeekData]);
      setSelectedWeek(weekKey);
      setDistances(newWeekData);
      setNewWeekDate('');
    } catch (error) {
      console.error('Error adding week:', error.message, error.response ? error.response.data : 'No response');
      alert('添加新周失败，请检查后端是否运行');
    }
  };

  const handleDeleteWeek = async () => {
    if (!selectedWeek) {
      alert('请先选择一个周');
      return;
    }
    if (window.confirm(`确定要删除 ${getWeekDates(selectedWeek).start} - ${getWeekDates(selectedWeek).end} 吗？`)) {
      await axios.post(`${API_URL}/delete`, { weekId: selectedWeek });
      const updatedWeeks = weeks.filter(w => w.weekId !== selectedWeek);
      setWeeks(updatedWeeks);
      setSelectedWeek(updatedWeeks.length > 0 ? updatedWeeks[0].weekId : '');
      fetchData();
    }
  };

  const handleCalculate = async () => {
    if (!selectedWeek) return;

    const updatedDistances = { ...distances, weekId: selectedWeek };
    const currentWeekIndex = weeks.findIndex(w => w.weekId === selectedWeek);
    const currentWeekData = weeks[currentWeekIndex] || { sat: 0, sun: 0 };

    const isFullAttendance = distances.sat >= 5 && distances.sun >= 5;
    const wasFullAttendance = currentWeekData.sat >= 5 && currentWeekData.sun >= 5;
    const dataChanged = JSON.stringify(distances) !== JSON.stringify(currentWeekData);

    if (dataChanged) {
      await axios.post(`${API_URL}/save`, updatedDistances);
      if (isFullAttendance !== wasFullAttendance) {
        const nextBonus = isFullAttendance ? bonus + 2 : Math.max(20, bonus - 2);
        await axios.post(`${API_URL}/save`, { weekId: 'attendanceBonus', value: nextBonus });
        setBonus(nextBonus);
      }
      fetchData();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const calculateTotal = () => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return days.reduce((sum, day) => sum + (distances[day] || 0), 0);
  };

  const wage = calculateTotal() * 6.66;
  const currentWeekIndex = weeks.findIndex(w => w.weekId === selectedWeek);
  const bonusThisWeek = distances.sat >= 5 && distances.sun >= 5 && currentWeekIndex >= 0 ? calculateAttendanceBonus(weeks, currentWeekIndex) : 0;
  const nextBonus = bonus;

  return (
    <div className="container">
      <h2>骑行记录与工资计算器</h2>
      
      <div className="input-group">
        <label>选择周:</label>
        <select value={selectedWeek} onChange={(e) => {
          setSelectedWeek(e.target.value);
          setDistances(weeks.find(w => w.weekId === e.target.value) || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 });
        }}>
          <option value="">请选择</option>
          {weeks.map(week => (
            <option key={week.weekId} value={week.weekId}>
              {getWeekDates(week.weekId).start} - {getWeekDates(week.weekId).end}
            </option>
          ))}
        </select>
        <div>{selectedWeek && `${getWeekDates(selectedWeek).start} - ${getWeekDates(selectedWeek).end}`}</div>
      </div>

      <div className="input-group add-week">
        <label>添加新周:</label>
        <input type="date" value={newWeekDate} onChange={(e) => setNewWeekDate(e.target.value)} />
        <button onClick={handleAddWeek}>添加</button>
      </div>

      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
        <div className="input-group" key={day}>
          <label>{`星期${'一二三四五六日'[day === 'mon' ? 0 : day === 'tue' ? 1 : day === 'wed' ? 2 : day === 'thu' ? 3 : day === 'fri' ? 4 : day === 'sat' ? 5 : 6]} (公里):`}</label>
          <input
            type="number"
            value={distances[day] || 0}
            onChange={(e) => setDistances({ ...distances, [day]: parseFloat(e.target.value) || 0 })}
            min="0"
          />
        </div>
      ))}

      <div className="input-group">
        <label>上传图片:</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {image && <img src={image} alt="Uploaded" style={{ maxWidth: '300px', marginTop: '10px' }} />}
      </div>

      <div className="button-group">
        <button onClick={handleCalculate}>计算并保存</button>
        <button onClick={() => setShowHistory(true)}>列出全勤奖计算</button>
        <button onClick={handleDeleteWeek}>删除当前周</button>
      </div>

      <div className="result">
        <table>
          <thead>
            <tr><th>日期</th><th>距离</th><th>备注</th></tr>
          </thead>
          <tbody>
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
              <tr key={day}>
                <td>{`星期${'一二三四五六日'[day === 'mon' ? 0 : day === 'tue' ? 1 : day === 'wed' ? 2 : day === 'thu' ? 3 : day === 'fri' ? 4 : day === 'sat' ? 5 : 6]}`}</td>
                <td>{distances[day] || 0} 公里</td>
                <td>{(day === 'sat' || day === 'sun') && ((distances[day] || 0) >= 5 ? '达到5公里目标' : '未达5公里目标')}</td>
              </tr>
            ))}
            <tr><td><strong>一周总计</strong></td><td>{calculateTotal()} 公里</td><td></td></tr>
            <tr><td><strong>本周工资</strong></td><td>{wage.toFixed(2)} 元</td><td></td></tr>
            <tr><td><strong>全勤奖</strong></td><td>{bonusThisWeek} 元</td><td></td></tr>
            <tr><td><strong>下周全勤奖金额</strong></td><td>{nextBonus} 元</td><td></td></tr>
            <tr><td><strong>总收入</strong></td><td>{(wage + bonusThisWeek).toFixed(2)} 元</td><td></td></tr>
          </tbody>
        </table>
      </div>

      {showHistory && (
        <div id="bonusHistory">
          <h3>全勤奖计算历史</h3>
          <table id="bonusHistoryTable">
            <thead>
              <tr><th>周</th><th>日期范围</th><th>星期六距离</th><th>星期日距离</th><th>本周全勤奖</th></tr>
            </thead>
            <tbody>
              {weeks.map((week, index) => {
                const { start, end } = getWeekDates(week.weekId);
                const earnedBonus = week.sat >= 5 && week.sun >= 5 ? calculateAttendanceBonus(weeks, index) : 0;
                return (
                  <tr key={week.weekId}>
                    <td>第{index + 1}周</td>
                    <td>{start} - {end}</td>
                    <td>星期六: {week.sat} 公里</td>
                    <td>星期日: {week.sun} 公里</td>
                    <td>{earnedBonus} 元</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={() => setShowHistory(false)}>关闭</button>
        </div>
      )}
    </div>
  );
};

export default App;
